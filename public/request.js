// Keep the timeout active while reading the response body as well as headers.
window.fetchWithTimeout = async function (url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const body = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      headers: response.headers,
      text: async () => body,
      json: async () => JSON.parse(body)
    };
  } catch (error) {
    const writing = options.method && options.method !== "GET";
    throw new Error(writing
      ? "Chưa xác nhận được kết quả gửi. Hãy kiểm tra lại trạng thái trước khi gửi lại."
      : "Không thể tải dữ liệu. Vui lòng kiểm tra kết nối và thử lại sau.");
  } finally {
    clearTimeout(timer);
  }
};
