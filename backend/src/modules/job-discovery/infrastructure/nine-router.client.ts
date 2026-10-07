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
}
export interface FetchedPage {
  content: string;
  url: string;
  finalUrlVerified: boolean;
  links: string[];
}
export class NineRouterClient {
  private readonly logger = new Logger(NineRouterClient.name);
  private readonly http: AxiosInstance;
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
  ): Promise<string[]> {
    const response = await this.http.post(
      "/v1/search",
      {
        model: this.config.searchModel,
        search_type: "web",
        query,
        domain_filter: [source],
        max_results: 10,
      },
      { signal, timeout: this.config.searchTimeout },
    );
    if (!Array.isArray(response.data?.results))
      throw new DiscoveryError("PROVIDER_RESPONSE_INVALID", 502);
    return response.data.results
      .slice(0, 10)
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
    const response = await this.fetchResponse(url, signal);
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
