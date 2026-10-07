import axios, { AxiosInstance } from "axios";
import { Logger } from "@nestjs/common";
import { DiscoveryError } from "../domain/discovery";

export interface RouterConfig {
  baseUrl: string;
  apiKey?: string;
  searchModel?: string;
  fetchModel?: string;
  fetchPolicyVerified: boolean;
  searchTimeout: number;
  fetchTimeout: number;
  // The shared gateway's webfetch providers can hold only one in-flight
  // request per account; bursts trip a provider-side lock that outlasts our
  // own retry budget. Serialize fetches to stay under that ceiling.
  fetchConcurrency?: number;
}
export interface FetchedPage {
  content: string;
  url: string;
  finalUrlVerified: boolean;
  links: string[];
}
// A shared single-account fetch provider can lock out for 19-30s once it
// sees repeated failures; hammering it during that window only extends the
// lockout. Stop sending requests for a cooldown instead.
const TRANSIENT_FETCH_CODES = /^(FETCH_EMPTY_CONTENT|FETCH_TIMEOUT|FETCH_NETWORK_ERROR|FETCH_HTTP_50[234])$/;
export class NineRouterClient {
  private readonly logger = new Logger(NineRouterClient.name);
  private readonly http: AxiosInstance;
  private readonly fetchConcurrency: number;
  private fetchRunning = 0;
  private readonly fetchQueue: Array<() => void> = [];
  private circuitOpenUntil = 0;
  private consecutiveTransientFailures = 0;
  private readonly circuitBreakerThreshold = 2;
  private readonly circuitBreakerCooldownMs = 25000;
  constructor(private readonly config: RouterConfig) {
    this.http = axios.create({
      baseURL: config.baseUrl.replace(/\/+$/, "").replace(/\/v1$/, ""),
      timeout: config.searchTimeout,
      maxRedirects: 0,
      maxContentLength: 2000000,
      maxBodyLength: 100000,
      headers: config.apiKey
        ? { Authorization: `Bearer ${config.apiKey}` }
        : {},
    });
    this.fetchConcurrency = Math.max(1, config.fetchConcurrency ?? 1);
  }
  private acquireFetchSlot(signal: AbortSignal): Promise<void> {
    if (this.fetchRunning < this.fetchConcurrency) {
      this.fetchRunning++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      const grant = () => {
        signal.removeEventListener("abort", onAbort);
        this.fetchRunning++;
        resolve();
      };
      const onAbort = () => {
        const index = this.fetchQueue.indexOf(grant);
        if (index !== -1) this.fetchQueue.splice(index, 1);
        reject(Object.assign(new Error("Fetch queue aborted"), { name: "AbortError" }));
      };
      this.fetchQueue.push(grant);
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }
  private releaseFetchSlot() {
    this.fetchRunning--;
    this.fetchQueue.shift()?.();
  }
  private recordTransientFailure(code: string) {
    this.consecutiveTransientFailures++;
    if (this.consecutiveTransientFailures < this.circuitBreakerThreshold)
      return;
    this.circuitOpenUntil = Date.now() + this.circuitBreakerCooldownMs;
    this.consecutiveTransientFailures = 0;
    this.logger.warn(
      JSON.stringify({
        stage: "circuit-open",
        cooldownMs: this.circuitBreakerCooldownMs,
        code,
      }),
    );
  }
  async ready(signal: AbortSignal) {
    if (!this.config.searchModel)
      throw new DiscoveryError("JOB_SEARCH_PROVIDER_UNAVAILABLE", 503);
    // Explicit aliases are not enumerated by models/web. Search support is
    // determined by the endpoint response; accepting an alias does not enable fetch.
    if (!["ag", "agents", "search-combo"].includes(this.config.searchModel))
      try {
        const response = await this.http.get("/v1/models/web", { signal });
        const models: unknown = response.data?.data;
        if (
          !Array.isArray(models) ||
          !models.some(
            (model) =>
              model &&
              typeof model === "object" &&
              model.id === this.config.searchModel,
          )
        )
          throw new DiscoveryError("JOB_SEARCH_PROVIDER_UNAVAILABLE", 503);
      } catch (error) {
        if (error instanceof DiscoveryError) throw error;
        throw new DiscoveryError("JOB_DISCOVERY_UNAVAILABLE", 503);
      }
    if (!this.config.fetchModel)
      throw new DiscoveryError("JOB_FETCH_PROVIDER_UNAVAILABLE", 503);
    // Attestation includes the provider's documented private-address/redirect
    // enforcement; our preflight and final-source checks are separate controls.
    if (!this.config.fetchPolicyVerified)
      throw new DiscoveryError("JOB_FETCH_SECURITY_UNVERIFIED", 503);
  }
  async search(
    query: string,
    source: string,
    signal: AbortSignal,
    maxResults = 10,
  ): Promise<string[]> {
    const limit = Math.max(1, Math.min(10, Math.floor(maxResults) || 10));
    const response = await this.http.post(
      "/v1/search",
      {
        model: this.config.searchModel,
        search_type: "web",
        query,
        domain_filter: [source],
        max_results: limit,
      },
      { signal, timeout: this.config.searchTimeout },
    );
    if (!Array.isArray(response.data?.results))
      throw new DiscoveryError("PROVIDER_RESPONSE_INVALID", 502);
    return response.data.results
      .slice(0, limit)
      .flatMap((row: unknown) =>
        row &&
        typeof row === "object" &&
        "url" in row &&
        typeof row.url === "string"
          ? [row.url]
          : [],
      );
  }
  async fetch(url: string, signal: AbortSignal): Promise<FetchedPage> {
    if (Date.now() < this.circuitOpenUntil)
      throw new DiscoveryError("FETCH_PROVIDER_COOLING_DOWN", 503);
    await this.acquireFetchSlot(signal);
    let response: Awaited<ReturnType<typeof this.fetchResponse>>;
    try {
      response = await this.fetchResponse(url, signal);
      this.consecutiveTransientFailures = 0;
    } catch (error) {
      if (
        !signal.aborted &&
        error instanceof DiscoveryError &&
        TRANSIENT_FETCH_CODES.test(error.code)
      )
        this.recordTransientFailure(error.code);
      throw error;
    } finally {
      this.releaseFetchSlot();
    }
    const data = response.data;
    if (
      typeof data?.url !== "string" ||
      typeof data?.content?.text !== "string" ||
      data.content.text.length > 200000
    )
      throw new DiscoveryError("PROVIDER_RESPONSE_INVALID", 502);
    const finalUrl = data.final_url;
    if (finalUrl != null && typeof finalUrl !== "string")
      throw new DiscoveryError("PROVIDER_RESPONSE_INVALID", 502);
    if (this.config.fetchModel === "tinyfish") {
      if (data.provider !== "tinyfish")
        throw new DiscoveryError("FETCH_PROVIDER_MISMATCH", 502);
      if (typeof finalUrl !== "string" || !finalUrl.trim())
        throw new DiscoveryError("FETCH_PROVENANCE_MISSING", 502);
      try {
        if (!["http:", "https:"].includes(new URL(finalUrl).protocol))
          throw new Error("invalid final protocol");
      } catch {
        throw new DiscoveryError("PROVIDER_RESPONSE_INVALID", 502);
      }
    }
    const links = Array.isArray(data.links)
      ? data.links.slice(0, 1000).flatMap((link: unknown) => {
          if (typeof link === "string") return [link];
          if (link && typeof link === "object") {
            if ("url" in link && typeof link.url === "string")
              return [link.url];
            if ("href" in link && typeof link.href === "string")
              return [link.href];
          }
          return [];
        })
      : [];
    return {
      url: finalUrl ?? data.url,
      content: data.content.text,
      finalUrlVerified: typeof finalUrl === "string" && finalUrl.length > 0,
      links,
    };
  }
  private async fetchResponse(url: string, signal: AbortSignal) {
    const deadline = Date.now() + this.config.fetchTimeout;
    for (let attempt = 1; attempt <= 2; attempt++) {
      signal.throwIfAborted();
      const remaining = Math.max(1, deadline - Date.now());
      try {
        return await this.http.post(
          "/v1/web/fetch",
          {
            model: this.config.fetchModel,
            url,
            format: this.config.fetchModel === "tinyfish" ? "markdown" : "html",
            max_characters: 200000,
            include_links: true,
          },
          {
            signal,
            timeout:
              attempt === 1
                ? Math.max(1, Math.floor(remaining * 0.65))
                : remaining,
          },
        );
      } catch (error) {
        if (signal.aborted) throw error;
        const failure = axios.isAxiosError(error) ? error : undefined;
        const status = failure?.response?.status;
        const transient =
          [502, 503, 504].includes(status ?? 0) ||
          ["ECONNABORTED", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN"].includes(
            failure?.code ?? "",
          );
        if (attempt === 1 && transient && Date.now() < deadline) {
          const target = new URL(url);
          this.logger.warn(
            JSON.stringify({
              stage: "fetch-retry",
              page:
                target.hostname === "vertexaisearch.cloud.google.com"
                  ? target.origin + "/grounding-api-redirect/[redacted]"
                  : target.origin + target.pathname,
              attempt,
              httpStatus: status,
              transportCode: failure?.code,
            }),
          );
          continue;
        }
        const upstream = failure?.response?.data;
        const message =
          typeof upstream?.error === "string"
            ? upstream.error
            : upstream?.error?.message;
        const code =
          status === 502 &&
          typeof message === "string" &&
          message.includes("empty_content")
            ? "FETCH_EMPTY_CONTENT"
            : ["ECONNABORTED", "ETIMEDOUT"].includes(failure?.code ?? "")
              ? "FETCH_TIMEOUT"
              : status
                ? `FETCH_HTTP_${status}`
                : "FETCH_NETWORK_ERROR";
        throw Object.assign(new DiscoveryError(code, 502), {
          attempts: attempt,
          upstreamStatus: status,
        });
      }
    }
    throw new DiscoveryError("FETCH_TIMEOUT", 502);
  }
}
