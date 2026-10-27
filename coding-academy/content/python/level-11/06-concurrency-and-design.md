---
id: py-11-6-concurrency-and-design
title: Concurrency, async and design principles
track: python
level: 11
order: 6
minutes: 50
summary: Run waiting-heavy tasks at the same time with threads and asyncio, understand when processes are needed, and apply design principles that keep larger programs manageable.
objectives:
  - Explain concurrency vs parallelism and I/O-bound vs CPU-bound work
  - Use ThreadPoolExecutor for tasks that spend time waiting
  - Write async functions with async/await and asyncio.gather
  - Protect shared data with a lock
  - Apply single responsibility, dependency injection and "keep it simple" to your designs
prerequisites: [py-11-1-decorators, py-11-4-advanced-exceptions-context-managers]
tags: [concurrency, parallelism, thread, threading, threadpoolexecutor, concurrent.futures, asyncio, async, await, gather, lock, race condition, gil, multiprocessing, design principles, solid, single responsibility, dependency injection, kiss, yagni, dry]
---

## Simple explanation

Some programs spend most of their time **waiting** - for a web page, a file, a database. While one task waits,
another could run. That is **concurrency**.

```python
import time
from concurrent.futures import ThreadPoolExecutor

def download(name):
    time.sleep(1)               # pretend to wait 1 second for the network
    return f"{name} done"

start = time.perf_counter()
with ThreadPoolExecutor(max_workers=3) as pool:
    results = list(pool.map(download, ["a", "b", "c"]))
print(results, round(time.perf_counter() - start), "s")   # ['a done', 'b done', 'c done'] 1 s
```

Three one-second waits finished in about **one** second instead of three, because they waited **together**.

**asyncio** does the same with a single thread, using `async def` and `await` to mark the places where a
task can pause and let others run.

## Real-world analogy

A cook making breakfast doesn't stand and watch the kettle. They start the kettle, put bread in the toaster,
and fry eggs while both are busy - **concurrency**: one person, many tasks overlapping their waiting time.
**Parallelism** is having **several cooks** working at the same moment - needed when the work itself (chopping,
not waiting) is the bottleneck.

## Technical definition

- **I/O-bound** work waits on the network/disk → threads or asyncio help.
  **CPU-bound** work keeps the processor busy (big calculations) → needs **processes**
  (`multiprocessing`, `ProcessPoolExecutor`) for real parallelism, because CPython's **GIL** lets only one
  thread run Python code at a time. (Python 3.13+ also offers an experimental "free-threaded" build without the
  GIL.) *Process pools are not available inside this app's practice lab, which doesn't allow starting
  processes.*
- `concurrent.futures.ThreadPoolExecutor`: `pool.map(func, items)` (results in input order) or
  `pool.submit(func, x)` → a **future** with `.result()`; `as_completed(futures)` yields them as they finish.
- **Race condition**: two threads update shared data at the same time and an update is lost. Protect it with
  `threading.Lock()` (`with lock: ...`), or avoid shared state by returning results instead.
- **asyncio**: `async def` defines a coroutine; `await` pauses it until another coroutine finishes;
  `asyncio.run(main())` starts the event loop; `asyncio.gather(*coros)` runs several concurrently and returns
  results in order. Blocking calls like `time.sleep` inside async code freeze everything - use
  `await asyncio.sleep`, and async libraries (e.g. `httpx`, `aiohttp`) for network I/O.
- **Design principles**:
  - **Single responsibility** - each function/class does one job (read, calculate, display separately).
  - **Dependency injection** - pass things in (a data source, a clock, a send function) instead of creating
    them inside, so they can be swapped and tested.
  - **DRY** (don't repeat yourself), **KISS** (keep it simple), **YAGNI** (you aren't gonna need it - don't build
    features "just in case").
  - **Separate pure logic from input/output** - pure functions are easy to test.
  - **SOLID** is a well-known set of five object-oriented principles; single responsibility is the first and
    most useful.

## Step-by-step examples

**Example 1 - asyncio.gather**

```python
import asyncio

async def fetch(name, seconds):
    await asyncio.sleep(seconds)      # pretend network wait
    return f"{name} ({seconds}s)"

async def main():
    results = await asyncio.gather(fetch("prices", 1), fetch("news", 1), fetch("weather", 1))
    print(results)

asyncio.run(main())    # ['prices (1s)', 'news (1s)', 'weather (1s)'] after about 1 second
```

**Example 2 - a lock around shared data**

```python
import threading

count = 0
lock = threading.Lock()

def add_many():
    global count
    for _ in range(100_000):
        with lock:              # only one thread at a time in here
            count += 1

threads = [threading.Thread(target=add_many) for _ in range(4)]
for t in threads: t.start()
for t in threads: t.join()
print(count)                    # always 400000
```

**Example 3 - dependency injection for testability**

```python
def greeting(get_hour):
    hour = get_hour()
    return "Good morning" if hour < 12 else "Good afternoon"

print(greeting(lambda: 9))      # tests can pass any hour
# real use: from datetime import datetime; greeting(lambda: datetime.now().hour)
```

## Common mistakes

- **Threads for CPU-heavy maths** - no speed-up because of the GIL; use processes (on your own computer) or
  faster libraries.
- **`time.sleep` inside async code** - blocks the whole event loop; use `await asyncio.sleep`.
- **Forgetting `await`** - you get a coroutine object instead of a result (and a warning).
- **Sharing mutable data between threads without a lock** - rare, hard-to-reproduce bugs.
- **Too many workers** - hundreds of threads hitting one website will get you blocked; keep pools small.
- **Over-designing** - layers of abstraction for a 50-line script. Apply principles when they reduce pain.

## Practical application

Downloading 50 web pages, checking 200 links, or calling several APIs is I/O-bound: a thread pool or asyncio
cuts the total time to roughly the slowest single request. Heavy number crunching belongs in NumPy/pandas or a
process pool. Design principles matter most as programs grow: keeping data access, calculations and display
separate lets you swap a CSV for a database, or a terminal for a web page, without rewriting everything.

## Revision notes

- Concurrency = overlapping waits; parallelism = truly simultaneous work.
- I/O-bound → `ThreadPoolExecutor` or asyncio; CPU-bound → processes / compiled libraries.
- `pool.map` keeps order; `asyncio.gather` keeps order; `asyncio.run(main())` starts async code.
- Shared data + threads → `threading.Lock`.
- Single responsibility, dependency injection, DRY, KISS, YAGNI; separate logic from I/O.

```exercise
id: thread-pool
title: Overlap waiting with a thread pool
difficulty: beginner
instructions: |
  `check_site` pretends to check a website (it waits 0.3 seconds). Checking five sites one after another takes
  about 1.5 seconds. Use `ThreadPoolExecutor(max_workers=5)` and `pool.map` to check them concurrently. Print each
  result in the original order, then whether the whole job took under 1 second.

  ```text
  example.com: ok
  python.org: ok
  bad.invalid: unreachable
  wikipedia.org: ok
  test.invalid: unreachable
  finished in under 1 second: True
  ```
starter: |
  import time
  from concurrent.futures import ThreadPoolExecutor

  def check_site(site):
      time.sleep(0.3)        # pretend network wait
      return f"{site}: {'unreachable' if site.endswith('.invalid') else 'ok'}"

  sites = ["example.com", "python.org", "bad.invalid", "wikipedia.org", "test.invalid"]
  start = time.perf_counter()
  results = [check_site(s) for s in sites]      # make this concurrent
  for line in results:
      print(line)
  print("finished in under 1 second:", time.perf_counter() - start < 1)
hints:
  - "`with ThreadPoolExecutor(max_workers=5) as pool:`"
  - "Inside: `results = list(pool.map(check_site, sites))` - map returns results in input order."
solution: |
  import time
  from concurrent.futures import ThreadPoolExecutor

  def check_site(site):
      time.sleep(0.3)        # pretend network wait
      return f"{site}: {'unreachable' if site.endswith('.invalid') else 'ok'}"

  sites = ["example.com", "python.org", "bad.invalid", "wikipedia.org", "test.invalid"]
  start = time.perf_counter()
  with ThreadPoolExecutor(max_workers=5) as pool:
      results = list(pool.map(check_site, sites))
  for line in results:
      print(line)
  print("finished in under 1 second:", time.perf_counter() - start < 1)
explanation: |
  All five waits overlap, so the job takes about 0.3 seconds instead of 1.5. `pool.map` returns results in the
  same order as the input, even if they finish in a different order.
check:
  expected: |
    example.com: ok
    python.org: ok
    bad.invalid: unreachable
    wikipedia.org: ok
    test.invalid: unreachable
    finished in under 1 second: True
  require_text: ["ThreadPoolExecutor("]
```

```exercise
id: async-gather
title: async and await
difficulty: intermediate
instructions: |
  Write a coroutine `fetch_price(item, delay)` that waits `delay` seconds with `await asyncio.sleep(delay)` and
  returns `(item, price)` using the `PRICES` dict. In `main()`, use `asyncio.gather` to fetch all three items
  concurrently, then print each and the total. The delays add up to 0.9 s but the whole run must take under
  0.6 s.

  ```text
  tea: 2.5
  milk: 1.2
  bread: 1.8
  total: 5.5
  fast: True
  ```
starter: |
  import asyncio
  import time

  PRICES = {"tea": 2.5, "milk": 1.2, "bread": 1.8}

  # write fetch_price here

  async def main():
      results = []   # use asyncio.gather here
      for item, price in results:
          print(f"{item}: {price}")
      print("total:", round(sum(price for _, price in results), 2))

  start = time.perf_counter()
  asyncio.run(main())
  print("fast:", time.perf_counter() - start < 0.6)
hints:
  - "`async def fetch_price(item, delay):` then `await asyncio.sleep(delay)` and `return item, PRICES[item]`."
  - "`results = await asyncio.gather(fetch_price(\"tea\", 0.3), fetch_price(\"milk\", 0.3), fetch_price(\"bread\", 0.3))`"
solution: |
  import asyncio
  import time

  PRICES = {"tea": 2.5, "milk": 1.2, "bread": 1.8}

  async def fetch_price(item, delay):
      await asyncio.sleep(delay)
      return item, PRICES[item]

  async def main():
      results = await asyncio.gather(
          fetch_price("tea", 0.3), fetch_price("milk", 0.3), fetch_price("bread", 0.3)
      )
      for item, price in results:
          print(f"{item}: {price}")
      print("total:", round(sum(price for _, price in results), 2))

  start = time.perf_counter()
  asyncio.run(main())
  print("fast:", time.perf_counter() - start < 0.6)
explanation: |
  Each coroutine pauses at `await asyncio.sleep`, letting the others run, so the three waits overlap. `gather`
  returns the results in the order the coroutines were given.
check:
  expected: |
    tea: 2.5
    milk: 1.2
    bread: 1.8
    total: 5.5
    fast: True
  require_text: ["async def", "await", "gather"]
  forbid_text: ["time.sleep"]
```

```exercise
id: lock-shared
title: Fix a race condition with a lock
difficulty: intermediate
instructions: |
  Four threads each record 50,000 visits in a shared dictionary. The read-modify-write
  `visits["total"] = current + 1` is not safe when threads interleave, so updates can be lost. Use a
  `threading.Lock` so that the read and the write happen together, and the total is always 200000.

  ```text
  200000
  ```
starter: |
  import threading

  visits = {"total": 0}

  def record_visits():
      for _ in range(50_000):
          current = visits["total"]
          visits["total"] = current + 1

  threads = [threading.Thread(target=record_visits) for _ in range(4)]
  for t in threads:
      t.start()
  for t in threads:
      t.join()
  print(visits["total"])
hints:
  - "Create `lock = threading.Lock()` next to `visits`."
  - "Put both lines inside `with lock:` in the loop."
solution: |
  import threading

  visits = {"total": 0}
  lock = threading.Lock()

  def record_visits():
      for _ in range(50_000):
          with lock:
              current = visits["total"]
              visits["total"] = current + 1

  threads = [threading.Thread(target=record_visits) for _ in range(4)]
  for t in threads:
      t.start()
  for t in threads:
      t.join()
  print(visits["total"])
explanation: |
  Without the lock, two threads can both read the same `current` value and both write `current + 1`, so one visit
  is lost. Whether that actually happens on a given run depends on timing - which is what makes race conditions
  so hard to spot. The lock makes the read-and-write one indivisible step.
check:
  expected: |
    200000
  require_text: ["Lock()", "with lock"]
```

```exercise
id: single-responsibility
title: Separate logic from input and output
difficulty: challenge
instructions: |
  `report()` reads data, calculates and prints all in one function, and it reads from a hard-coded source - hard
  to test or reuse. Split it into:

  - `summarise(rows)` - a **pure** function (no printing) returning a dict with `count`, `total` and `largest`
    (the name of the biggest expense)
  - `format_summary(summary)` - returns the text (no printing)
  - `report(load_rows)` - takes a **function** that loads rows (dependency injection), then prints the
    formatted summary

  ```text
  3 expenses, total 82.5, largest: rent share
  ```
starter: |
  def report():
      rows = [("groceries", 32.0), ("rent share", 45.0), ("bus", 5.5)]
      total = 0
      largest = None
      for name, amount in rows:
          total += amount
          if largest is None or amount > largest[1]:
              largest = (name, amount)
      print(f"{len(rows)} expenses, total {total}, largest: {largest[0]}")

  report()
hints:
  - "`summarise(rows)` can use `sum(...)` and `max(rows, key=lambda r: r[1])[0]` - and must `return` a dict."
  - "`format_summary(s)` returns the f-string using `s[\"count\"]`, `s[\"total\"]`, `s[\"largest\"]`."
  - "`def report(load_rows): print(format_summary(summarise(load_rows())))`, then call `report(lambda: [...])` with the three rows."
solution: |
  def summarise(rows):
      return {
          "count": len(rows),
          "total": sum(amount for _, amount in rows),
          "largest": max(rows, key=lambda r: r[1])[0],
      }

  def format_summary(summary):
      return f"{summary['count']} expenses, total {summary['total']}, largest: {summary['largest']}"

  def report(load_rows):
      print(format_summary(summarise(load_rows())))

  report(lambda: [("groceries", 32.0), ("rent share", 45.0), ("bus", 5.5)])
explanation: |
  Each function now has one job. `summarise` can be tested with any list, `format_summary` with any summary, and
  `report` can load rows from a CSV, a database or a test list - just pass a different loader.
check:
  expected: |
    3 expenses, total 82.5, largest: rent share
  tests:
    - name: summarise is pure and correct
      code: |
        result = capture_output(summarise, [("a", 1.0), ("b", 3.0)])
        assert result[0] == {"count": 2, "total": 4.0, "largest": "b"}, f"summarise returned {result[0]!r}"
        assert result[1] == "", "summarise should not print anything"
    - name: format_summary returns text without printing
      code: |
        text, printed = capture_output(format_summary, {"count": 1, "total": 2.0, "largest": "x"})
        assert text == "1 expenses, total 2.0, largest: x" and printed == ""
    - name: report uses the loader it is given
      code: |
        _, printed = capture_output(report, lambda: [("only", 9.0)])
        assert printed.strip() == "1 expenses, total 9.0, largest: only"
```

```quiz
- id: q1
  question: Which kind of task benefits most from threads or asyncio in Python?
  options:
    - I/O-bound tasks that spend time waiting (network, disk)
    - Heavy maths that keeps the CPU busy
    - Printing a single line
    - Any task, always by the number of threads
  answer: I/O-bound tasks that spend time waiting (network, disk)
  explanation: CPU-bound work needs processes or compiled libraries because of the GIL.
- id: q2
  question: What does `await` do inside an async function?
  options:
    - Pauses this coroutine until the awaited one finishes, letting others run meanwhile
    - Stops the whole program
    - Starts a new process
    - Makes the code run on several CPUs
  answer: Pauses this coroutine until the awaited one finishes, letting others run meanwhile
  explanation: That's how several coroutines overlap their waiting in one thread.
- id: q3
  question: What is a race condition?
  options:
    - A bug where the result depends on the unpredictable timing of threads
    - A competition between programs
    - A very fast loop
    - An error when a program runs too slowly
  answer: A bug where the result depends on the unpredictable timing of threads
  explanation: Protect shared data with a lock, or avoid sharing it.
- id: q4
  question: Why shouldn't you call time.sleep() inside async code?
  options:
    - It blocks the whole event loop, so no other task can run
    - It raises a SyntaxError
    - It sleeps for minutes instead of seconds
    - It's fine - there's no difference
  answer: It blocks the whole event loop, so no other task can run
  explanation: Use await asyncio.sleep() instead.
- id: q5
  question: What is dependency injection?
  options:
    - Passing the things a function needs (data source, clock...) in from outside instead of creating them inside
    - Installing dependencies with pip
    - Injecting code into another program
    - Importing every module at the top
  answer: Passing the things a function needs (data source, clock...) in from outside instead of creating them inside
  explanation: It makes code easier to test and to adapt.
- id: q6
  question: What does YAGNI stand for?
  options:
    - You aren't gonna need it - don't build features just in case
    - Your algorithm grows nearly infinitely
    - Yet another generic naming idea
    - You always get new issues
  answer: You aren't gonna need it - don't build features just in case
  explanation: Build what you need now; keep the design simple enough to extend later.
```
