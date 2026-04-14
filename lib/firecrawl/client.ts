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

/**
 * /errors エンドポイント用の fetch
 * self-hosted Firecrawl はエラーが0件の場合に 404 や非標準レスポンスを返すことがあるため、
 * その場合は空のエラーリストとして正常応答を返す。
 */
async function fetchErrorsEndpoint(
  url: string
): Promise<CrawlErrorsResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url, {
      method: "GET",
      headers: getHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    // 404 / 422 / 400 → エラーなしとして扱う
    if (response.status === 404 || response.status === 422 || response.status === 400) {
      return { success: true, errors: [] };
    }

    if (!response.ok) {
      let message = response.statusText;
      try {
        const errorBody = await response.json();
        message = errorBody.error || errorBody.message || message;
      } catch {
        // ignore
      }
      return { success: false, error: `HTTP ${response.status}: ${message}` };
    }

    if (response.status === 204) {
      return { success: true, errors: [] };
    }

    const body = await response.json();

    // API が配列を直接返す場合に対応
    if (Array.isArray(body)) {
      return { success: true, errors: body };
    }

    // success フィールドがない場合のフォールバック
    if (body.success === undefined) {
      return {
        success: true,
        errors: body.errors ?? body.data ?? [],
      };
    }

    return body as CrawlErrorsResponse;
  } catch (error) {
    // ネットワークエラー等
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: `接続エラー: ${msg}` };
  }
}

/**
 * DELETE エンドポイント用の fetch（キャンセル）
 * 完了済みジョブに対する DELETE は 404/409 を返すことがあるため、
 * ステータスコード別に判別したメッセージを返す。
 */
async function fetchCancelEndpoint(
  url: string
): Promise<{ success: boolean; reason?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url, {
      method: "DELETE",
      headers: getHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 404) {
      return { success: false, reason: "ジョブが見つかりません。IDを確認するか、既に完了・期限切れの可能性があります。" };
    }

    if (response.status === 409) {
      return { success: false, reason: "ジョブは既に完了またはキャンセル済みです。" };
    }

    if (!response.ok) {
      let message = response.statusText;
      try {
        const errorBody = await response.json();
        message = errorBody.error || errorBody.message || message;
      } catch {
        // ignore
      }
      return { success: false, reason: `HTTP ${response.status}: ${message}` };
    }

    if (response.status === 204) {
      return { success: true };
    }

    const body = await response.json();
    return { success: body.success ?? true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, reason: `接続エラー: ${msg}` };
  }
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

export async function cancelCrawl(crawlId: string): Promise<{ success: boolean; reason?: string }> {
  return fetchCancelEndpoint(
    `${getBaseUrl()}/v1/crawl/${encodeURIComponent(crawlId)}`
  );
}

export async function getCrawlErrors(crawlId: string): Promise<CrawlErrorsResponse> {
  return fetchErrorsEndpoint(
    `${getBaseUrl()}/v1/crawl/${encodeURIComponent(crawlId)}/errors`
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
): Promise<{ success: boolean; reason?: string }> {
  return fetchCancelEndpoint(
    `${getBaseUrl()}/v1/batch/scrape/${encodeURIComponent(batchId)}`
  );
}

export async function getBatchScrapeErrors(
  batchId: string
): Promise<CrawlErrorsResponse> {
  return fetchErrorsEndpoint(
    `${getBaseUrl()}/v1/batch/scrape/${encodeURIComponent(batchId)}/errors`
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
