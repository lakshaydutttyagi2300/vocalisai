---
id: py-10-2-apis-http-json
title: APIs, HTTP and JSON
track: python
level: 10
order: 2
minutes: 45
summary: Learn how programs talk to web services - URLs, HTTP methods, status codes, headers and JSON - and practise handling API responses safely, all offline.
objectives:
  - Describe a request and a response (method, URL, status code, headers, body)
  - Build URLs with query parameters safely
  - Parse JSON responses and pull out the values you need
  - Handle errors and status codes without crashing
  - Collect results from a paginated API
prerequisites: [py-7-2-csv-json]
tags: [api, http, https, json, request, response, status code, get, post, url, query string, urllib, requests, pagination, rate limit, api key]
---

## Simple explanation

An **API** (Application Programming Interface) is a way for programs to ask another program for data or
actions. **Web APIs** use **HTTP** - the same system your browser uses:

1. Your program sends a **request**: a **method** (`GET` = fetch, `POST` = send/create, `PUT`/`PATCH` = change,
   `DELETE` = remove), a **URL** and optional **headers** and **body**.
2. The server sends back a **response**: a **status code** (200 = OK, 404 = not found...), headers and a
   **body** - usually **JSON** text.

```python
import json

body = '{"city": "Leeds", "temp_c": 11.5, "conditions": ["cloudy", "windy"]}'   # what a server might send
data = json.loads(body)          # JSON text -> Python dict
print(data["city"], data["temp_c"])        # Leeds 11.5
```

> This app works offline, so the practice lab does not call real web services. The exercises use realistic
> sample responses. When you are online, the real thing looks like Example 3 below.

## Real-world analogy

An API is a **restaurant menu with a waiter**. You don't walk into the kitchen; you place an order (request) in
an agreed format, and the waiter brings back your dish (response) - or tells you "sorry, we're out of that"
(an error status code). An **API key** is like your membership card: it identifies you and may be charged.

## Technical definition

- **URL parts**: `https://api.example.com/v1/weather?city=Leeds&units=metric` - scheme (`https`), host,
  path (`/v1/weather`), **query string** (`?city=Leeds&units=metric`).
- **Status code families**: `2xx` success (200 OK, 201 Created, 204 No Content), `3xx` redirect, `4xx` your
  mistake (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests), `5xx`
  the server's problem (500, 503).
- **JSON ↔ Python**: object ↔ dict, array ↔ list, string ↔ str, number ↔ int/float, `true/false` ↔
  `True/False`, `null` ↔ `None`. `json.loads(text)` parses; `json.dumps(obj)` creates JSON text.
- **Standard library**: `urllib.request.urlopen(url)` makes requests; `urllib.parse.urlencode(dict)` builds
  safe query strings. The popular third-party package **requests** (`pip install requests`) is easier:
  `requests.get(url, params={...}, timeout=10)`.
- **Pagination**: APIs return large results in pages (`?page=2`) and tell you whether more exist.
- **Rate limits**: servers limit requests per minute; respect `429` and wait before retrying.
- **Secrets**: API keys belong in environment variables or a settings file outside your code - never paste
  them into code you share.

## Step-by-step examples

**Example 1 - building a URL safely**

```python
from urllib.parse import urlencode

params = {"q": "fish & chips", "page": 2}
url = "https://api.example.com/search?" + urlencode(params)
print(url)   # https://api.example.com/search?q=fish+%26+chips&page=2
```

`urlencode` escapes special characters - `&` inside the value would otherwise break the URL.

**Example 2 - handling a response defensively**

```python
import json

def read_temperature(status, body):
    if status != 200:
        return f"Request failed ({status})"
    data = json.loads(body)
    return data.get("temp_c", "unknown")      # .get avoids KeyError if a field is missing

print(read_temperature(200, '{"temp_c": 11.5}'))   # 11.5
print(read_temperature(404, ""))                    # Request failed (404)
```

**Example 3 - a real request (needs internet; run on your own computer, not in the lab)**

```python
import json
from urllib.request import urlopen

with urlopen("https://api.github.com/repos/python/cpython", timeout=10) as response:
    data = json.loads(response.read().decode("utf-8"))
print(data["full_name"], data["stargazers_count"])
```

With the `requests` package the same request is
`requests.get("https://api.github.com/repos/python/cpython", timeout=10).json()`.

## Common mistakes

- **No timeout** - a request can hang forever. Always pass `timeout=`.
- **Assuming success** - check the status code before reading the body.
- **`data["key"]` on optional fields** - use `.get("key")` with a default when a field may be missing.
- **Building URLs with `+` and user text** - spaces and `&` break them; use `urlencode`.
- **Hard-coding API keys** in scripts you share or upload. Use environment variables.
- **Hammering an API in a fast loop** - you will be rate-limited (429) or blocked; add pauses and caching.

## Practical application

APIs let your programs fetch exchange rates, weather, sports results, your own data from online services, or
send messages. The pattern is always the same: build the request, check the status, parse JSON, pick out the
fields, handle errors. The AI Tutor in this app is itself an API client: it sends your question to a provider
and parses the reply.

## Revision notes

- Request = method + URL + headers + body; response = status + headers + body.
- 2xx ok, 4xx your request is wrong, 5xx server problem, 429 slow down.
- `json.loads` (text → Python), `json.dumps` (Python → text).
- `urlencode` for query strings; always set a timeout.
- Use `.get()` for optional fields; keep API keys out of code.

```exercise
id: parse-weather
title: Read values from a JSON response
difficulty: beginner
instructions: |
  `body` is the text an API returned. Parse it and print the city, the temperature and the first forecast
  day's summary, in this format:

  ```text
  Leeds: 11.5°C
  Tomorrow: light rain
  ```
starter: |
  import json

  body = '{"city": "Leeds", "current": {"temp_c": 11.5}, "forecast": [{"day": "Tue", "summary": "light rain"}, {"day": "Wed", "summary": "sunny"}]}'

  # your code here
hints:
  - "`data = json.loads(body)` gives you a dictionary."
  - "The temperature is nested: `data[\"current\"][\"temp_c\"]`."
  - "`forecast` is a list; the first item is `data[\"forecast\"][0]`."
solution: |
  import json

  body = '{"city": "Leeds", "current": {"temp_c": 11.5}, "forecast": [{"day": "Tue", "summary": "light rain"}, {"day": "Wed", "summary": "sunny"}]}'

  data = json.loads(body)
  print(f"{data['city']}: {data['current']['temp_c']}°C")
  print(f"Tomorrow: {data['forecast'][0]['summary']}")
explanation: |
  JSON objects become dictionaries and arrays become lists, so you reach nested values by chaining `[...]`.
check:
  expected: |
    Leeds: 11.5°C
    Tomorrow: light rain
  requires: [call:loads]
```

```exercise
id: build-url
title: Build a query URL safely
difficulty: beginner
instructions: |
  Write `search_url(term, page)` that returns the URL `https://api.example.com/search` with the query
  parameters `q` (the term) and `page`, built with `urllib.parse.urlencode`.

  ```text
  https://api.example.com/search?q=python&page=1
  https://api.example.com/search?q=fish+%26+chips&page=3
  ```
starter: |
  from urllib.parse import urlencode

  def search_url(term, page):
      pass

  print(search_url("python", 1))
  print(search_url("fish & chips", 3))
hints:
  - "`urlencode({\"q\": term, \"page\": page})` returns `q=...&page=...`."
  - "Join it to the base address with a `?`."
solution: |
  from urllib.parse import urlencode

  def search_url(term, page):
      return "https://api.example.com/search?" + urlencode({"q": term, "page": page})

  print(search_url("python", 1))
  print(search_url("fish & chips", 3))
explanation: |
  `urlencode` turns spaces into `+` and `&` into `%26`, so the server reads "fish & chips" as one value instead of
  two broken parameters.
check:
  expected: |
    https://api.example.com/search?q=python&page=1
    https://api.example.com/search?q=fish+%26+chips&page=3
  requires: [call:urlencode]
```

```exercise
id: handle-status
title: Handle success and failure
difficulty: intermediate
instructions: |
  Write `describe(status, body)` that returns:

  - for 200: `"OK: <n> users"` where n is the length of the `users` list in the JSON body
  - for 404: `"Not found"`
  - for 429: `"Too many requests - wait and retry"`
  - for any other 4xx: `"Client error <status>"`; for any 5xx: `"Server error <status>"`
  - if the body of a 200 response is not valid JSON: `"Bad response"` (catch `json.JSONDecodeError`)

  ```text
  OK: 2 users
  Not found
  Too many requests - wait and retry
  Client error 401
  Server error 503
  Bad response
  ```
starter: |
  import json

  def describe(status, body):
      pass

  print(describe(200, '{"users": [{"name": "Asha"}, {"name": "Ben"}]}'))
  print(describe(404, ""))
  print(describe(429, ""))
  print(describe(401, '{"error": "bad key"}'))
  print(describe(503, ""))
  print(describe(200, "<html>oops</html>"))
hints:
  - "Check the specific codes (200, 404, 429) first, then ranges: `400 <= status < 500`."
  - "Wrap `json.loads(body)` in `try:` / `except json.JSONDecodeError:`."
solution: |
  import json

  def describe(status, body):
      if status == 200:
          try:
              data = json.loads(body)
          except json.JSONDecodeError:
              return "Bad response"
          return f"OK: {len(data['users'])} users"
      if status == 404:
          return "Not found"
      if status == 429:
          return "Too many requests - wait and retry"
      if 400 <= status < 500:
          return f"Client error {status}"
      if 500 <= status < 600:
          return f"Server error {status}"
      return f"Unexpected status {status}"

  print(describe(200, '{"users": [{"name": "Asha"}, {"name": "Ben"}]}'))
  print(describe(404, ""))
  print(describe(429, ""))
  print(describe(401, '{"error": "bad key"}'))
  print(describe(503, ""))
  print(describe(200, "<html>oops</html>"))
explanation: |
  Real services fail in all these ways. Checking specific codes before ranges, and catching bad JSON, keeps your
  program running and gives a clear message.
check:
  expected: |
    OK: 2 users
    Not found
    Too many requests - wait and retry
    Client error 401
    Server error 503
    Bad response
  requires: [try]
```

```exercise
id: paginate
title: Collect every page
difficulty: challenge
instructions: |
  `fake_get(page)` imitates an API that returns one page of products at a time as JSON text, with a
  `next_page` field that is `null` on the last page. Write `fetch_all()` that starts at page 1, keeps requesting
  until there is no next page, and returns all product names in one list. Print the list and how many requests
  were made.

  ```text
  ['kettle', 'toaster', 'blender', 'mixer', 'scales']
  requests made: 3
  ```
starter: |
  import json

  PAGES = {
      1: {"items": ["kettle", "toaster"], "next_page": 2},
      2: {"items": ["blender", "mixer"], "next_page": 3},
      3: {"items": ["scales"], "next_page": None},
  }
  calls = 0

  def fake_get(page):
      global calls
      calls += 1
      return json.dumps(PAGES[page])

  def fetch_all():
      pass

  print(fetch_all())
  print("requests made:", calls)
hints:
  - "Start with `page = 1` and `names = []`, and loop `while page is not None:`."
  - "Inside: `data = json.loads(fake_get(page))`, `names.extend(data[\"items\"])`, `page = data[\"next_page\"]`."
solution: |
  import json

  PAGES = {
      1: {"items": ["kettle", "toaster"], "next_page": 2},
      2: {"items": ["blender", "mixer"], "next_page": 3},
      3: {"items": ["scales"], "next_page": None},
  }
  calls = 0

  def fake_get(page):
      global calls
      calls += 1
      return json.dumps(PAGES[page])

  def fetch_all():
      names = []
      page = 1
      while page is not None:
          data = json.loads(fake_get(page))
          names.extend(data["items"])
          page = data["next_page"]
      return names

  print(fetch_all())
  print("requests made:", calls)
explanation: |
  JSON `null` becomes Python `None`, which ends the loop. Real APIs use the same idea (a next-page number, a
  cursor or a "next" link). With a real service you would also add a short pause between requests.
check:
  expected: |
    ['kettle', 'toaster', 'blender', 'mixer', 'scales']
    requests made: 3
  requires: [while]
```

```quiz
- id: q1
  question: What does status code 404 mean?
  options:
    - The requested resource was not found
    - Everything worked
    - The server crashed
    - You are sending too many requests
  answer: The requested resource was not found
  explanation: 4xx codes mean the request was wrong; 404 specifically means "not found".
- id: q2
  question: What does `json.loads(text)` do?
  options:
    - Turns JSON text into Python objects (dicts, lists...)
    - Downloads JSON from the internet
    - Saves a dict to a file
    - Checks a URL
  answer: Turns JSON text into Python objects (dicts, lists...)
  explanation: json.dumps does the reverse.
- id: q3
  question: Which HTTP method is normally used just to fetch data?
  options:
    - GET
    - POST
    - DELETE
    - PATCH
  answer: GET
  explanation: POST sends data to create something; DELETE removes; PATCH changes.
- id: q4
  question: Why should every web request have a timeout?
  options:
    - Without one, the program can wait forever if the server doesn't answer
    - Timeouts make requests cheaper
    - Servers reject requests without one
    - It encrypts the request
  answer: Without one, the program can wait forever if the server doesn't answer
  explanation: A timeout turns a hang into an error you can handle.
- id: q5
  question: Where should an API key live?
  options:
    - In an environment variable or a settings file kept out of shared code
    - Directly in the script so it's easy to find
    - In the URL of every public web page
    - In a comment at the top of the file
  answer: In an environment variable or a settings file kept out of shared code
  explanation: Keys in shared code get leaked and misused - and they may be billed to you.
- id: q6
  question: What does JSON `null` become in Python?
  options:
    - None
    - 0
    - '"null"'
    - False
  answer: None
  explanation: true/false become True/False, and null becomes None.
```
