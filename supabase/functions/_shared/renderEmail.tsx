import { renderToStaticMarkup } from "npm:react-dom@18.3.1/server";
import type { ReactElement } from "npm:react@18.3.1";

const DOCTYPE =
  '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';

/**
 * Synchronous React-to-HTML for emails. Uses react-dom/server directly
 * (explicit npm: specifier so Deno resolves it at bundle time).
 */
export function renderEmailToHtml(element: ReactElement): string {
  const markup = renderToStaticMarkup(element);
  return `${DOCTYPE}${markup}`;
}
