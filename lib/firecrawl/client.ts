/**
 * Firecrawl API クライアント
 *
 * セルフホスト / クラウド Firecrawl インスタンスへの HTTP リクエストを管理
 * - 自動リトライ（エクスポネンシャルバックオフ）
 * - タイムアウト制御
 */

import type {
  ScrapeRequest,
  ScrapeResponse,
  CrawlRequest,
  CrawlStartResponse,
  CrawlStatusResponse,
  CrawlErrorsResponse,
  ActiveCrawlsResponse,
  MapRequest,
  MapResponse,
  BatchScrapeRequest,
  BatchScrapeStartResponse,
  SearchRequest,
  SearchResponse,
  ExtractRequest,
  ExtractResponse,
} from "./types";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30000;

export class FirecrawlError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "FirecrawlError";
  }
}

function getBaseUrl(): string {
  const url = process.env.FIRECRAWL_API_URL;
  if (!url) {
    throw new FirecrawlError(
      500,
      "FIRECRAWL_API_URL が設定されていません。環境変数を確認してください。"
    );
  }
  return url.replace(/\/+$/, "");
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = response.statusText;
    try {
      const errorBody = await response.json();
      message = errorBody.error || errorBody.message || message;
    } catch {
      // JSON パースに失敗した場合はデフォルトメッセージを使用
    }
    throw new FirecrawlError(response.status, message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.status === 429 && attempt < retries) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      return handleResponse<T>(response);
    } catch (error) {
      if (error instanceof FirecrawlError) throw error;

      if (attempt < retries) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      const msg =
        error instanceof Error ? error.message : "Unknown error";
      throw new FirecrawlError(
        503,
        `Firecrawl サーバーに接続できません: ${msg}`
      );
    }
  }

  throw new FirecrawlError(503, "リトライ回数の上限に達しました");
}

// ── Scrape ──

export async function scrape(params: ScrapeRequest): Promise<ScrapeResponse> {
  return fetchWithRetry<ScrapeResponse>(
    `${getBaseUrl()}/v1/scrape`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(params),
    }
  );
}

// ── Crawl ──

export async function startCrawl(params: CrawlRequest): Promise<CrawlStartResponse> {
  return fetchWithRetry<CrawlStartResponse>(
    `${getBaseUrl()}/v1/crawl`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(params),
    }
  );
}

export async function getCrawlStatus(crawlId: string): Promise<CrawlStatusResponse> {
  return fetchWithRetry<CrawlStatusResponse>(
    `${getBaseUrl()}/v1/crawl/${encodeURIComponent(crawlId)}`,
    {
      method: "GET",
      headers: getHeaders(),
    }
  );
}

export async function cancelCrawl(crawlId: string): Promise<{ success: boolean }> {
  return fetchWithRetry<{ success: boolean }>(
    `${getBaseUrl()}/v1/crawl/${encodeURIComponent(crawlId)}`,
    {
      method: "DELETE",
      headers: getHeaders(),
    }
  );
}

export async function getCrawlErrors(crawlId: string): Promise<CrawlErrorsResponse> {
  return fetchWithRetry<CrawlErrorsResponse>(
    `${getBaseUrl()}/v1/crawl/${encodeURIComponent(crawlId)}/errors`,
    {
      method: "GET",
      headers: getHeaders(),
    }
  );
}

export async function getActiveCrawls(): Promise<ActiveCrawlsResponse> {
  return fetchWithRetry<ActiveCrawlsResponse>(
    `${getBaseUrl()}/v1/crawl/active`,
    {
      method: "GET",
      headers: getHeaders(),
    }
  );
}

// ── Map ──

export async function mapSite(params: MapRequest): Promise<MapResponse> {
  return fetchWithRetry<MapResponse>(
    `${getBaseUrl()}/v1/map`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(params),
    }
  );
}

// ── Batch Scrape ──

export async function startBatchScrape(
  params: BatchScrapeRequest
): Promise<BatchScrapeStartResponse> {
  return fetchWithRetry<BatchScrapeStartResponse>(
    `${getBaseUrl()}/v1/batch/scrape`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(params),
    }
  );
}

export async function getBatchScrapeStatus(
  batchId: string
): Promise<CrawlStatusResponse> {
  return fetchWithRetry<CrawlStatusResponse>(
    `${getBaseUrl()}/v1/batch/scrape/${encodeURIComponent(batchId)}`,
    {
      method: "GET",
      headers: getHeaders(),
    }
  );
}

export async function cancelBatchScrape(
  batchId: string
): Promise<{ success: boolean }> {
  return fetchWithRetry<{ success: boolean }>(
    `${getBaseUrl()}/v1/batch/scrape/${encodeURIComponent(batchId)}`,
    {
      method: "DELETE",
      headers: getHeaders(),
    }
  );
}

export async function getBatchScrapeErrors(
  batchId: string
): Promise<CrawlErrorsResponse> {
  return fetchWithRetry<CrawlErrorsResponse>(
    `${getBaseUrl()}/v1/batch/scrape/${encodeURIComponent(batchId)}/errors`,
    {
      method: "GET",
      headers: getHeaders(),
    }
  );
}

// ── Search ──

export async function search(params: SearchRequest): Promise<SearchResponse> {
  return fetchWithRetry<SearchResponse>(
    `${getBaseUrl()}/v1/search`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(params),
    }
  );
}

// ── Extract ──

export async function extract(params: ExtractRequest): Promise<ExtractResponse> {
  return fetchWithRetry<ExtractResponse>(
    `${getBaseUrl()}/v1/extract`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(params),
    }
  );
}
