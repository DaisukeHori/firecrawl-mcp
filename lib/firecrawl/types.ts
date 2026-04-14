/**
 * Firecrawl API 型定義
 */

// ── Scrape ──

export type ScrapeFormat = "markdown" | "html" | "rawHtml" | "links" | "screenshot" | "screenshot@fullPage";

export interface ScrapeAction {
  type: "wait" | "click" | "write" | "press" | "scroll" | "screenshot";
  selector?: string;
  milliseconds?: number;
  text?: string;
  key?: string;
  direction?: "up" | "down";
  amount?: number;
  fullPage?: boolean;
}

export interface ScrapeRequest {
  url: string;
  formats?: ScrapeFormat[];
  includeTags?: string[];
  excludeTags?: string[];
  onlyMainContent?: boolean;
  waitFor?: number;
  timeout?: number;
  actions?: ScrapeAction[];
  headers?: Record<string, string>;
  mobile?: boolean;
}

export interface ScrapeResponseData {
  markdown?: string;
  html?: string;
  rawHtml?: string;
  links?: string[];
  screenshot?: string;
  metadata?: {
    title?: string;
    description?: string;
    language?: string;
    sourceURL?: string;
    statusCode?: number;
    [key: string]: unknown;
  };
}

export interface ScrapeResponse {
  success: boolean;
  data?: ScrapeResponseData;
  error?: string;
}

// ── Crawl ──

export interface CrawlRequest {
  url: string;
  excludePaths?: string[];
  includePaths?: string[];
  maxDepth?: number;
  limit?: number;
  allowBackwardLinks?: boolean;
  allowExternalLinks?: boolean;
  ignoreSitemap?: boolean;
  scrapeOptions?: {
    formats?: ScrapeFormat[];
    includeTags?: string[];
    excludeTags?: string[];
    onlyMainContent?: boolean;
    waitFor?: number;
  };
}

export interface CrawlStartResponse {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

export interface CrawlStatusResponse {
  success: boolean;
  status?: "scraping" | "completed" | "failed" | "cancelled";
  total?: number;
  completed?: number;
  creditsUsed?: number;
  expiresAt?: string;
  data?: ScrapeResponseData[];
  error?: string;
  next?: string;
}

export interface CrawlErrorItem {
  id: string;
  timestamp: string;
  url: string;
  error: string;
}

export interface CrawlErrorsResponse {
  success: boolean;
  errors?: CrawlErrorItem[];
  error?: string;
}

export interface ActiveCrawlItem {
  id: string;
  url: string;
  status: string;
  createdAt?: string;
}

export interface ActiveCrawlsResponse {
  success: boolean;
  crawls?: ActiveCrawlItem[];
  error?: string;
}

// ── Map ──

export interface MapRequest {
  url: string;
  search?: string;
  ignoreSitemap?: boolean;
  includeSubdomains?: boolean;
  limit?: number;
}

export interface MapResponse {
  success: boolean;
  links?: string[];
  error?: string;
}

// ── Batch Scrape ──

export interface BatchScrapeRequest {
  urls: string[];
  formats?: ScrapeFormat[];
  includeTags?: string[];
  excludeTags?: string[];
  onlyMainContent?: boolean;
  waitFor?: number;
}

export interface BatchScrapeStartResponse {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

// ── Search ──

export interface SearchResult {
  url: string;
  title?: string;
  description?: string;
  markdown?: string;
}

export interface SearchRequest {
  query: string;
  limit?: number;
  scrapeOptions?: {
    formats?: ScrapeFormat[];
    onlyMainContent?: boolean;
  };
}

export interface SearchResponse {
  success: boolean;
  data?: SearchResult[];
  error?: string;
}

// ── Extract ──

export interface ExtractRequest {
  urls: string[];
  prompt?: string;
  schema?: Record<string, unknown>;
  enableWebSearch?: boolean;
  ignoreSitemap?: boolean;
  includeSubdomains?: boolean;
  showSources?: boolean;
}

export interface ExtractResponse {
  success: boolean;
  data?: Record<string, unknown>;
  extractId?: string;
  sources?: Record<string, string[]>;
  error?: string;
}
