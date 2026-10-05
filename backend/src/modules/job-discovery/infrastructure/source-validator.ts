import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { isIP } from "node:net";
import { DiscoveryError } from "../domain/discovery";

export function publicAddress(address: string): boolean {
  if (isIP(address) === 6)
    address = new URL(`http://[${address}]/`).hostname.slice(1, -1);
  if (isIP(address) === 6)
    return (
      /^[23][0-9a-f]{3}:/i.test(address) &&
      !/^2001:(?:db8|0):|^2002:/i.test(address)
    );
  if (isIP(address) !== 4) return false;
  const bytes = address.split(".").map(Number),
    a = bytes[0],
    b = bytes[1],
    c = bytes[2];
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 &&
      (b === 168 ||
        (b === 0 && (c === 0 || c === 2)) ||
        (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113)
  );
}
export class SourceValidator {
  constructor(private readonly domains: string[]) {}
  grounding(value: string) {
    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        !url.port &&
        url.hostname === "vertexaisearch.cloud.google.com" &&
        /^\/grounding-api-redirect\/[A-Za-z0-9_=-]{1,4096}$/.test(
          url.pathname,
        ) &&
        !url.search &&
        !url.hash
      );
    } catch {
      return false;
    }
  }
  searchCandidate(value: string) {
    return this.allowed(value) || this.grounding(value);
  }
  allowed(value: string) {
    try {
      const url = new URL(value),
        host = url.hostname.toLowerCase();
      return (
        ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        !url.port &&
        !isIP(host.replace(/^\[|\]$/g, "")) &&
        this.domains.some(
          (domain) => host === domain || host.endsWith(`.${domain}`),
        )
      );
    } catch {
      return false;
    }
  }
  async validate(value: string, signal?: AbortSignal) {
    if (!this.allowed(value)) throw new DiscoveryError("SOURCE_REJECTED", 400);
    return this.addresses(value, signal);
  }
  private async addresses(value: string, signal?: AbortSignal) {
    const resolution = lookup(new URL(value).hostname, {
      all: true,
      verbatim: true,
    });
    let listener: (() => void) | undefined;
    const addresses = await (signal
      ? Promise.race([
          resolution,
          new Promise<never>((_resolve, reject) => {
            listener = () => reject(new Error("aborted"));
            if (signal.aborted) listener();
            else signal.addEventListener("abort", listener, { once: true });
          }),
        ]).finally(() => {
          if (listener) signal.removeEventListener("abort", listener);
        })
      : resolution);
    if (
      !addresses.length ||
      addresses.some((result) => !publicAddress(result.address))
    )
      throw new DiscoveryError("SOURCE_REJECTED", 400);
    return addresses;
  }
  // Google is a narrowly scoped transit host, never a job source. GET is needed
  // because grounding redirects can reject HEAD. Validate each hop before following.
  async resolveSearch(value: string, signal: AbortSignal): Promise<string> {
    if (this.allowed(value)) return this.resolve(value, signal);
    if (!this.grounding(value))
      throw new DiscoveryError("SOURCE_REJECTED", 400);
    let url = value;
    for (let hop = 0; hop < 5; hop++) {
      const addresses = await this.addresses(url, signal);
      const response = await new Promise<{ status: number; location?: string }>(
        (resolve, reject) => {
          const req = httpsRequest(
            new URL(url),
            {
              method: "GET",
              signal,
              timeout: 8000,
              lookup: (_hostname, options, callback) =>
                options.all
                  ? callback(null, addresses)
                  : callback(null, addresses[0].address, addresses[0].family),
              headers: { "User-Agent": "JobMatch-Discovery/1.0" },
            },
            (res) => {
              resolve({
                status: res.statusCode ?? 0,
                location: res.headers.location,
              });
              res.destroy();
            },
          );
          req.on("error", reject);
          req.on("timeout", () => req.destroy(new Error("timeout")));
          req.end();
        },
      );
      if (
        ![301, 302, 303, 307, 308].includes(response.status) ||
        !response.location
      )
        throw new DiscoveryError("SEARCH_LINK_UNRESOLVED", 502);
      const next = new URL(response.location, url).toString();
      if (this.allowed(next)) return this.resolve(next, signal);
      if (!this.grounding(next))
        throw new DiscoveryError("SOURCE_REJECTED", 400);
      url = next;
    }
    throw new DiscoveryError("SEARCH_LINK_UNRESOLVED", 502);
  }
  // Probe with DNS pinned to validated public addresses and manual redirects.
  async resolve(value: string, signal: AbortSignal): Promise<string> {
    let url = value;
    for (let hop = 0; hop < 5; hop++) {
      const addresses = await this.validate(url, signal);
      const target = new URL(url);
      const response = await new Promise<{ status: number; location?: string }>(
        (resolve, reject) => {
          const req = (
            target.protocol === "https:" ? httpsRequest : httpRequest
          )(
            target,
            {
              method: "HEAD",
              signal,
              timeout: 8000,
              lookup: (_hostname, options, callback) =>
                options.all
                  ? callback(null, addresses)
                  : callback(null, addresses[0].address, addresses[0].family),
              headers: { "User-Agent": "JobMatch-Discovery/1.0" },
            },
            (res) => {
              const status = res.statusCode ?? 0;
              res.resume();
              resolve({ status, location: res.headers.location });
            },
          );
          req.on("error", reject);
          req.on("timeout", () => req.destroy(new Error("timeout")));
          req.end();
        },
      );
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        if (!response.location)
          throw new DiscoveryError("SOURCE_REJECTED", 400);
        url = new URL(response.location, url).toString();
        if (!this.allowed(url))
          throw new DiscoveryError("SOURCE_REJECTED", 400);
        continue;
      }
      if (
        (response.status >= 200 && response.status < 300) ||
        response.status === 405
      )
        return url;
      throw new DiscoveryError("SOURCE_UNAVAILABLE", 502);
    }
    throw new DiscoveryError("SOURCE_REJECTED", 400);
  }
}
