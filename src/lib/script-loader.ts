export function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.getAttribute("data-loaded") === "true") {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", (e) => reject(e));
      }
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.setAttribute("data-loaded", "false");
    script.onload = () => {
      script.setAttribute("data-loaded", "true");
      resolve();
    };
    script.onerror = (e) => reject(e);
    document.body.appendChild(script);
  });
}

export function loadStyle(href: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    const existing = document.querySelector(`link[href="${href}"]`);
    if (existing) return resolve();
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => resolve();
    link.onerror = (e) => reject(e);
    document.head.appendChild(link);
  });
}
