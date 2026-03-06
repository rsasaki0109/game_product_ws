#!/usr/bin/env node

const args = process.argv.slice(2);

function usage() {
  console.error("usage: unityhub_cdp_control.js --port <port> <action>...");
  console.error(
    "actions: dump[:label] dump-all[:label] click-testid:<id> click-text:<text> click-text-contains:<text> invoke:open-signin invoke-channel:<channel> invoke-str:<channel>:<arg> sleep:<ms>",
  );
  process.exit(1);
}

if (args.length < 3 || args[0] !== "--port") {
  usage();
}

const port = Number(args[1]);
const actions = args.slice(2);

if (!Number.isInteger(port) || port <= 0) {
  usage();
}

async function getMainTarget() {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`);
  if (!response.ok) {
    throw new Error(`failed to query devtools targets: ${response.status}`);
  }

  const targets = await response.json();
  const target =
    targets.find(
      (item) =>
        item.type === "page" &&
        typeof item.url === "string" &&
        item.url.startsWith("file:///") &&
        item.url.includes("/build/renderer/index.html"),
    ) ||
    targets.find((item) => item.type === "page" && item.title === "Unity Hub") ||
    targets[0];

  if (!target || !target.webSocketDebuggerUrl) {
    throw new Error("failed to locate Unity Hub renderer target");
  }

  return target;
}

async function main() {
  const target = await getMainTarget();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let nextId = 0;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  function evaluate(expression, awaitPromise = false) {
    return send("Runtime.evaluate", {
      expression,
      awaitPromise,
      returnByValue: true,
    }).then((message) => {
      if (message.exceptionDetails) {
        throw new Error(message.exceptionDetails.text || "Runtime.evaluate failed");
      }
      return message.result.value;
    });
  }

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) {
      return;
    }

    const request = pending.get(message.id);
    if (!request) {
      return;
    }

    pending.delete(message.id);
    if (message.error) {
      request.reject(new Error(JSON.stringify(message.error)));
      return;
    }

    request.resolve(message.result);
  };

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  try {
    await send("Runtime.enable");

    for (const action of actions) {
      if (action.startsWith("sleep:")) {
        const ms = Number(action.slice("sleep:".length));
        await new Promise((resolve) => setTimeout(resolve, ms));
        console.log(JSON.stringify({ action, ok: true }));
        continue;
      }

      if (action.startsWith("dump")) {
        const includeAll = action.startsWith("dump-all");
        const label = action.includes(":") ? action.split(":").slice(1).join(":") : "dump";
        const value = await evaluate(`(() => {
          const items = Array.from(document.querySelectorAll("[data-testid],button,a,input,[role='button']"))
            .map((element) => ({
              testid: element.getAttribute("data-testid"),
              tag: element.tagName,
              disabled: Boolean(element.disabled),
              ariaLabel: element.getAttribute("aria-label"),
              text: (element.innerText || "").trim(),
            }))
            .filter((item) => item.testid || item.text)
            .slice(0, ${includeAll ? 200 : 60});

          return {
            label: ${JSON.stringify(label)},
            href: location.href,
            hash: location.hash,
            text: (document.body.innerText || "").slice(0, ${includeAll ? 5000 : 1800}),
            items,
          };
        })()`);
        console.log(JSON.stringify({ action, ok: true, value }));
        continue;
      }

      if (action.startsWith("click-testid:")) {
        const testId = action.slice("click-testid:".length);
        const value = await evaluate(`(() => {
          const element = document.querySelector('[data-testid="${testId}"]');
          if (!element) {
            return { ok: false, reason: "not_found" };
          }

          element.click();
          return {
            ok: true,
            text: (element.innerText || "").trim(),
            testid: element.getAttribute("data-testid"),
          };
        })()`);
        console.log(JSON.stringify({ action, ...value }));
        continue;
      }

      if (action.startsWith("click-text:")) {
        const text = action.slice("click-text:".length);
        const value = await evaluate(`(() => {
          const normalize = (input) => (input || "").replace(/\\s+/g, " ").trim();
          const element = Array.from(document.querySelectorAll("button,[role='button'],a,div,span"))
            .find((item) => normalize(item.innerText) === ${JSON.stringify(text)});

          if (!element) {
            return { ok: false, reason: "not_found" };
          }

          element.click();
          return {
            ok: true,
            text: normalize(element.innerText),
            tag: element.tagName,
          };
        })()`);
        console.log(JSON.stringify({ action, ...value }));
        continue;
      }

      if (action.startsWith("click-text-contains:")) {
        const text = action.slice("click-text-contains:".length);
        const value = await evaluate(`(() => {
          const normalize = (input) => (input || "").replace(/\\s+/g, " ").trim();
          const needle = normalize(${JSON.stringify(text)});
          const element = Array.from(document.querySelectorAll("button,[role='button'],a,div,span"))
            .find((item) => {
              const haystack = normalize(item.innerText);
              return haystack && haystack.includes(needle);
            });

          if (!element) {
            return { ok: false, reason: "not_found" };
          }

          element.click();
          return {
            ok: true,
            text: normalize(element.innerText),
            tag: element.tagName,
            testid: element.getAttribute("data-testid"),
          };
        })()`);
        console.log(JSON.stringify({ action, ...value }));
        continue;
      }

      if (action === "invoke:open-signin") {
        const value = await evaluate(`window.api.ipcRenderer.invoke("redirect/openSignIn")
          .then(() => ({ ok: true }))
          .catch((error) => ({ ok: false, message: String(error) }))`, true);
        console.log(JSON.stringify({ action, ...value }));
        continue;
      }

      if (action.startsWith("invoke-channel:")) {
        const channel = action.slice("invoke-channel:".length);
        const value = await evaluate(`window.api.ipcRenderer.invoke(${JSON.stringify(channel)})
          .then((result) => ({ ok: true, result }))
          .catch((error) => ({ ok: false, message: String(error) }))`, true);
        console.log(JSON.stringify({ action, ...value }));
        continue;
      }

      if (action.startsWith("invoke-str:")) {
        const payload = action.slice("invoke-str:".length);
        const separator = payload.indexOf(":");
        if (separator === -1) {
          throw new Error(`invalid invoke-str action: ${action}`);
        }
        const channel = payload.slice(0, separator);
        const argument = payload.slice(separator + 1);
        const value = await evaluate(`window.api.ipcRenderer.invoke(${JSON.stringify(channel)}, ${JSON.stringify(argument)})
          .then((result) => ({ ok: true, result }))
          .catch((error) => ({ ok: false, message: String(error) }))`, true);
        console.log(JSON.stringify({ action, ...value }));
        continue;
      }

      throw new Error(`unsupported action: ${action}`);
    }
  } finally {
    ws.close();
  }
}

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
