# Hahow Recruit Backend

## 執行方式
以 Git Bash 或其他終端執行以下命令：

1. `git clone https://github.com/momocow/hahow-recruit-backend.git`
2. `cd hahow-recruit-backend/`
3. `npm install`
4. `npm test`
5. `npm run build`
6. `npm start` 
    > 可配置環境變數 `PORT` 變更監聽埠。(預設: `8088`)

## Scripts
- `npm run commit` 使用 Gitmoji 製作 Commit。
- `npm run lint` 執行 ESLint。
- `npm run build` 編譯 TypeScript 原始碼至 `dist/` 目錄。
- `npm run dev` 以開發模式執行專案。透過 nodemon 監聽檔案系統並使用 ts-node 執行程式。
- `npm start` 執行 `dist/` 內的程式。須先以 `npm run build` 建置專案，確保 `dist/` 為最新版本。
- `npm test` 執行測試。

## 專案架構

### .husky/
Git Hook。目前僅設定 Precommit 以執行 lint_staged。

### test/
單元測試檔案。

結構與 `lib/` 中測試所屬的原始碼檔案互相呼應。如 `/lib/index.ts` 的測試位於 `test/index.test.ts`。

### lib/
共用模組檔案。

#### routes/heroes.ts
API 路由。

#### errors.ts
錯誤處理用的 Middleware。

> 見 [ErrorTranslator](#errortranslator) 和 [ErrorLogger](#errorlogger)

#### hahow.ts
與 Hahow API 相關的呼叫邏輯。

#### index.ts
程式入口。創建 Koa Application。

#### negotiator.ts
用於處理回應資料格式轉換的邏輯。

> 見 [Negotiator](#negotiator)

#### request.ts
Http 連線控制，主要用於限制 HTTP 迸發 (Concurrency) 數量和 HTTP 請求超時的處理邏輯。

目前預設無迸發上限，並且 HTTP Timeout 為 1000 毫秒。

可以環境變數 `REQUEST_CONCURRENCY` 和 `REQUEST_TIMEOUT` (單位: 毫秒) 修改初始值。

## Server 架構

### Middleware Stack
Koa 是洋蔥式的請求處理流程，所有請求會先順著 Middleware Stack 一路向下至最底層，再從最底層一路向上。

```
      +-----------------+
      | ErrorTranslator |
      +-----------------+
              ↓
      +-----------------+
      |   ErrorLogger   |
      +-----------------+
              ↓
      +-----------------+
      |   Negotiator    |
      +-----------------+
              ↓
      +-----------------+
      | Router: /heroes |
      +-----------------+
          ↓          ↓
+-------------+  +-----------------+
| GET /heroes |  | GET /heroes/:id |
+-------------+  +-----------------+
```

### ErrorTranslator
用於將一般錯誤 (非 HttpError) 轉換為 ([HttpError](https://github.com/jshttp/http-errors))。

> [原始碼](lib/errors.ts#L27)

### ErrorLogger
記錄一般錯誤之錯誤訊息和呼叫堆疊。

> [原始碼](lib/errors.ts#L57)

### Negotiator
透過 HTTP 的 Accept 標頭決定返回的資料格式，若無法按客戶端請求之格式回應，則返回 406 Not Acceptable。

目前僅支援 JSON 一種資料格式。

> [原始碼](lib/negotiator.ts#L10)

### Router: /heroes
Heroes API 路由定義。

同時支援適時 (具相符的路徑，但無對應的 HTTP 動詞時) 返回 405 Method Not Allowed。

> [原始碼](lib/routes/heroes.ts#L64)

## 第三方模駔

### 應用依賴

### koa, koa-compose, @koa/router, http-errors
Koa 為主要 HTTP 框架，主打特性是輕量和 Promise (async/await) API。

與 Express 最大差異在於 Middleware 執行順序。
Koa 比較像是以 Decorator Pattern 一層一層不斷裝飾 Middleware，Express 以 Chain of Responsibility 一個接一個執行 Middleware。
Koa 是洋蔥式、Express 是瀑布式。

Koa 的錯誤處理可以 try/catch 處理，符合語言天性。

koa-compose 用於組合現有的 Middleware 為一個新的 Middleware。

@koa/router 用於以 Express Router 的風格定義路由和處理流程。

http-errors 用於以拋出錯誤的方式返回 HTTP 狀態 (通常是 4xx 客戶端錯誤或是 5xx 伺服器錯誤)。

Koa 為本專案的主架構。

### node-fetch
HTTP 客戶端，使用與 Web API 的 [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) 相同介面。

支援以 [AbortController](https://developer.mozilla.org/zh-TW/docs/Web/API/AbortController)/[AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) 中斷連線。

在本專案中用於與 Hahow API 發送請求。

### p-limit
用於限制迸發的邏輯。背後是一個佇列 (Queue) 結構暫存超出迸發限制的任務，並在前面的任務完成後緊接著執行下一個佇列中的任務。

在本專案中用於限制對 Hahow API 請求的迸發。

### joi
以聲明式的風格，用於定義 Schema 並驗證資料結構。

在本專案中用於驗證 Hahow API 的返回資料。

## 開發依賴

### eslint*, prettier*
程式法風格檢查與格式化。

本專案使用 Semi-Startdard 風格。

### jest, ts-jest, jest-fetch-mock, supertest
測試用依賴，主要測試架構為 jest。

ts-jest 為 Jest Transformer，用於直譯 TypeScript 程式碼，並執行型別檢查。

jest-fetch-mock 用於作為 node-fetch 的 "mock" 使用，除了避免直接於測試中呼叫 Hahow API 外，也可以針對測試案例設計、模擬 Hahow API 行為。如逾時未回應請求、返回未預期的狀態碼或資料等等。

supertest 用於測試 HTTP API，簡化 HTTP API 呼叫和斷言 (Assert/Expect) 的語法。

### ts-node, nodemon
ts-node 作為 TypeScript 專案中與 node 命令對等的使用方式。

nodemon 用於監聽檔案系統，並於改變發生時重啟伺服器。

### gitmoji
製作 Gitmoji 風格的 Commit 訊息。

## 註解風格
- 使用 `@TODO` 標記未來可能需要修改的程式碼。通常是在 Walk around 或是尚未開發完畢的功能的程式碼旁邊註記。
- 使用 `@see <url>` 註記參考資料。通常是 Walk around 來源、相關 Issue 或是 PR，或是用於佐證邏輯正確性。
- 其他註解通常是在程式碼不夠直覺 (not self-explanatory) 時註解。如一段數學運算的意涵、解釋細部流程、或是功能目標。

## 專案心得
這個專案的主軸，我想是在 HTTP Server 的架構和 Hahow API 資料重組、轉發的部分。

其中較多的心力放在設計與 Hahow API 的互動，包含限制請求迸發與錯誤處理，因此應該可以稱得上是這次最困難的部分。

限制迸發的部分，利用了 p-limit 這個第三方模組協助，限制同時請求的數量。我想最困難的點在於從琳瑯滿目的 npm 網頁中"找到"這個模組。一開始在思考如何實現這個功能時，我想到了一個關鍵字「Semaphore」：在 Linux 或是其他語言中主要用於同步管理的概念，可以為 Semaphore 定義一個數字作為資源的數量上限，每對 Semaphore acquire 一個資源，資源量就會減少一個，直到資源量歸零之後，後續的 acquire 都需等待前者 release。

以 semaphore、npm 簡單搜尋了一下，發現現有的 JS 模組都年久失修，後來以 Concurrency 才發現了 p-limit。

在與 Hahow API 的請求互動中，我也發現不能完全認定 Hahow API 總是會給我期望的資料，尤其曾經收到 `{code: 1000, message: 'xxx'}` 類似的錯誤訊息，除此之外，網路請求和回應的途中可能也都會有其他意外造成非預期的資料返回。

因此訂定了好幾個層次的檢查，從回應狀態、Content-type 到資料結構驗證，並以 502 Bad Gateway 表示後端 (Hahow API) 錯誤。

最後還想說明一下我對於身分驗證的錯誤處理，主要是基於 fail-fast 的原則，我將驗證邏輯分為三個情況，第一種是沒有提供 Name 且沒有提供 Password，第二種是有提供 Name 或 Password 且與 Hahow API 驗證成功，第三種則是有提供 Name 或 Password 且與 Hahow API 驗證失敗。前兩種定義為成功，因為這樣的行為符合預期，返回包含/不包含 profile 的資料，第三種定義為失敗，有提供 Name 或 Password 就表示客戶端預期資料包含 profile，但因為驗證失敗，因此應該立刻返回 401 Unauthorized 使前端進入錯誤處理的階段。
