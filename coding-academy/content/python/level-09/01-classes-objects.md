---
id: py-9-1-classes-objects
title: Classes and objects - attributes, methods and constructors
track: python
level: 9
order: 1
minutes: 50
summary: Bundle data and behaviour together - define classes, create objects, give them attributes in __init__, write methods that use self, and make objects print nicely.
objectives:
  - Explain what classes and objects are, using everyday examples
  - Define a class with an __init__ constructor and attributes
  - Write methods that read and change an object's attributes through self
  - Create several independent objects from one class
  - Add a __str__ method for readable printing
prerequisites: [py-6-3-problem-decomposition, py-4-4-dictionaries]
tags: [class, object, instance, attribute, method, self, __init__, constructor, __str__, oop]
---

## Simple explanation

So far data (variables, dictionaries) and behaviour (functions) were separate. **Object-oriented programming
(OOP)** bundles them together.

A **class** is a **blueprint**. An **object** (or **instance**) is a thing built from that blueprint.

```python
class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner          # attributes: the object's data
        self.balance = balance

    def deposit(self, amount):      # a method: the object's behaviour
        self.balance += amount

    def describe(self):
        return f"{self.owner} has {self.balance}"

acc = BankAccount("Asha", 100)      # create an object
acc.deposit(50)                     # call a method
print(acc.describe())               # Asha has 150
print(acc.balance)                  # 150
```

- `__init__` (the **constructor**) runs automatically when an object is created and sets up its attributes.
- `self` means **"this particular object"**. `self.balance` is *this* account's balance.
- Each object has its **own** attributes: two accounts have separate balances.

## Real-world analogy

A class is the **architect's plan for a house**; objects are the **actual houses** built from it. Every house has
the same rooms (attributes) and the same features (methods: open door, turn on lights), but each house has its
own furniture and its own owner. "Turn on *my* lights" - `self` - only affects the house you are in.

## Technical definition

- `class Name:` defines a new type. By convention class names use **CapitalizedWords** (PascalCase).
- Calling the class, `Name(args)`, creates a new instance and calls `__init__(self, args)` on it.
- **Instance attributes** are created by assigning to `self.something`, usually in `__init__`.
- **Methods** are functions defined inside the class. Their first parameter is the instance (named `self` by
  convention). `acc.deposit(50)` is shorthand for `BankAccount.deposit(acc, 50)`.
- **Class attributes** are defined directly in the class body and shared by all instances
  (e.g. `interest_rate = 0.02`).
- **Special ("dunder") methods** customise built-in behaviour: `__str__` (used by `print`/`str`), `__repr__`
  (developer view), `__eq__` (==), `__len__` (len), and more.
- Everything in Python is an object: strings, lists and functions are instances of classes (`str`, `list`...),
  which is why they have methods.

## Step-by-step examples

**Example 1 - a class with validation**

```python
class Product:
    def __init__(self, name, price, stock=0):
        if price < 0:
            raise ValueError("Price cannot be negative")
        self.name = name
        self.price = price
        self.stock = stock

    def stock_value(self):
        return self.price * self.stock

    def sell(self, quantity):
        if quantity > self.stock:
            raise ValueError(f"Only {self.stock} {self.name} left")
        self.stock -= quantity

lamp = Product("Lamp", 35.0, 10)
lamp.sell(3)
print(lamp.stock, lamp.stock_value())     # 7 245.0
```

**Example 2 - independent objects**

```python
a = Product("Pen", 1.5, 100)
b = Product("Pen", 1.5, 100)
a.sell(10)
print(a.stock, b.stock)      # 90 100  - each object has its own data
```

**Example 3 - __str__ for nice printing**

```python
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __str__(self):
        return f"({self.x}, {self.y})"

    def distance_to_origin(self):
        return (self.x ** 2 + self.y ** 2) ** 0.5

p = Point(3, 4)
print(p)                          # (3, 4)   - without __str__ you'd see <__main__.Point object at 0x...>
print(p.distance_to_origin())     # 5.0
```

**Example 4 - a class attribute**

```python
class Account:
    interest_rate = 0.03          # shared by every account

    def __init__(self, balance):
        self.balance = balance

    def add_interest(self):
        self.balance += self.balance * Account.interest_rate

acc = Account(1000)
acc.add_interest()
print(acc.balance)                # 1030.0
```

## Common mistakes

- **Forgetting `self`** as the first parameter of a method → `TypeError: takes 1 positional argument but 2 were
  given`.
- **Forgetting `self.`** inside methods: `balance += amount` creates/uses a local variable, not the attribute.
- **Calling methods on the class instead of an object**: `BankAccount.deposit(50)` - create an object first.
- **Misspelling `__init__`** (`__int__`, `_init_`) - the constructor never runs, so attributes are missing.
- **Mutable class attributes** (a list defined in the class body) are shared by all instances - define per-object
  lists in `__init__`.

## Practical application

Classes model things in your programs: an `Expense` with amount and category, a `Player` with score and lives, a
`Book` in a library system, a `Report` that knows how to load and summarise its data. Libraries you use (pandas
DataFrames, file objects, database connections) are all objects with attributes and methods.

## Revision notes

- `class Name:` blueprint; `obj = Name(args)` creates an object (instance).
- `__init__(self, ...)` sets up attributes: `self.attr = value`.
- Methods: functions in the class; first parameter `self` = this object; call `obj.method()`.
- Each object has its own attributes; class attributes are shared.
- `__str__` controls what `print(obj)` shows.

```exercise
id: rectangle-class
title: A Rectangle class
difficulty: beginner
instructions: |
  Complete the `Rectangle` class: `__init__` stores `width` and `height`; `area()` returns width × height;
  `perimeter()` returns 2 × (width + height). The starter code then prints:

  ```text
  12
  14
  50
  ```
starter: |
  class Rectangle:
      def __init__(self, width, height):
          pass

      def area(self):
          pass

      def perimeter(self):
          pass

  r = Rectangle(3, 4)
  print(r.area())
  print(r.perimeter())
  print(Rectangle(5, 10).area())
hints:
  - "In `__init__`: `self.width = width` and `self.height = height`."
  - "`return self.width * self.height`"
solution: |
  class Rectangle:
      def __init__(self, width, height):
          self.width = width
          self.height = height

      def area(self):
          return self.width * self.height

      def perimeter(self):
          return 2 * (self.width + self.height)

  r = Rectangle(3, 4)
  print(r.area())
  print(r.perimeter())
  print(Rectangle(5, 10).area())
explanation: |
  `__init__` saves the values on the object with `self.`; the methods read them back through `self`.
check:
  expected: |
    12
    14
    50
  tests:
    - name: attributes are stored on the object
      code: |
        r2 = Rectangle(2, 9)
        assert r2.width == 2 and r2.height == 9
```

```exercise
id: counter-class
title: A click counter
difficulty: beginner
instructions: |
  Write a class `Counter` with:

  - `__init__` setting `self.count = 0`
  - `click()` adding 1
  - `reset()` setting the count back to 0

  The starter code checks that two counters are independent:

  ```text
  3 1
  0 1
  ```
starter: |
  class Counter:
      pass

  a = Counter()
  b = Counter()
  a.click(); a.click(); a.click()
  b.click()
  print(a.count, b.count)
  a.reset()
  print(a.count, b.count)
hints:
  - "Replace `pass` with the three methods, each taking `self` as the first parameter."
  - "`def click(self): self.count += 1`"
solution: |
  class Counter:
      def __init__(self):
          self.count = 0

      def click(self):
          self.count += 1

      def reset(self):
          self.count = 0

  a = Counter()
  b = Counter()
  a.click(); a.click(); a.click()
  b.click()
  print(a.count, b.count)
  a.reset()
  print(a.count, b.count)
explanation: |
  Each object created from the class has its own `count` attribute, so clicking `a` does not change `b`.
check:
  expected: |
    3 1
    0 1
  requires: [class]
```

```exercise
id: bank-account
title: A safe bank account
difficulty: intermediate
instructions: |
  Write `BankAccount(owner, balance=0)` with methods:

  - `deposit(amount)` - add money; raise `ValueError("Deposit must be positive")` if amount ≤ 0
  - `withdraw(amount)` - subtract; raise `ValueError("Insufficient funds")` if amount > balance
  - `__str__` - returns e.g. `Asha: 120.00` (balance with 2 decimals)

  ```text
  Asha: 120.00
  Error: Insufficient funds
  Asha: 120.00
  ```
starter: |
  class BankAccount:
      pass

  acc = BankAccount("Asha", 100)
  acc.deposit(50)
  acc.withdraw(30)
  print(acc)
  try:
      acc.withdraw(500)
  except ValueError as err:
      print("Error:", err)
  print(acc)
hints:
  - "`def __init__(self, owner, balance=0): self.owner = owner; self.balance = balance` (on separate lines)."
  - "Check the condition and `raise ValueError(...)` *before* changing the balance."
  - "`def __str__(self): return f\"{self.owner}: {self.balance:.2f}\"`"
solution: |
  class BankAccount:
      def __init__(self, owner, balance=0):
          self.owner = owner
          self.balance = balance

      def deposit(self, amount):
          if amount <= 0:
              raise ValueError("Deposit must be positive")
          self.balance += amount

      def withdraw(self, amount):
          if amount > self.balance:
              raise ValueError("Insufficient funds")
          self.balance -= amount

      def __str__(self):
          return f"{self.owner}: {self.balance:.2f}"

  acc = BankAccount("Asha", 100)
  acc.deposit(50)
  acc.withdraw(30)
  print(acc)
  try:
      acc.withdraw(500)
  except ValueError as err:
      print("Error:", err)
  print(acc)
explanation: |
  The class protects its own data: invalid operations raise errors *before* the balance changes, so the account
  can never become inconsistent. `__str__` makes `print(acc)` readable.
check:
  expected: |
    Asha: 120.00
    Error: Insufficient funds
    Asha: 120.00
  tests:
    - name: deposits must be positive
      code: |
        a = BankAccount("T")
        try:
            a.deposit(0)
            raise AssertionError("deposit(0) should raise ValueError")
        except ValueError:
            pass
        assert a.balance == 0
```

```exercise
id: shopping-cart
title: A shopping cart class
difficulty: challenge
instructions: |
  Write `Cart` with:

  - `__init__` - an empty dictionary `self.items` mapping product name → `[price, quantity]`
  - `add(name, price, quantity=1)` - add the product, or increase its quantity if already in the cart
  - `remove(name)` - remove a product completely (do nothing if it is not there)
  - `total()` - the sum of price × quantity, rounded to 2 decimals
  - `__len__` - the total number of items (sum of quantities), so `len(cart)` works

  ```text
  Items: 4
  Total: 12.0
  Items: 3
  Total: 7.5
  ```
starter: |
  class Cart:
      pass

  cart = Cart()
  cart.add("tea", 2.5, 2)
  cart.add("cake", 4.5)
  cart.add("tea", 2.5)
  print("Items:", len(cart))
  print("Total:", cart.total())
  cart.remove("cake")
  cart.remove("nothing")
  print("Items:", len(cart))
  print("Total:", cart.total())
hints:
  - "In `add`: `if name in self.items: self.items[name][1] += quantity` else store `[price, quantity]`."
  - "`self.items.pop(name, None)` removes a key without an error if it is missing."
  - "`def __len__(self): return sum(q for price, q in self.items.values())`"
solution: |
  class Cart:
      def __init__(self):
          self.items = {}

      def add(self, name, price, quantity=1):
          if name in self.items:
              self.items[name][1] += quantity
          else:
              self.items[name] = [price, quantity]

      def remove(self, name):
          self.items.pop(name, None)

      def total(self):
          return round(sum(price * qty for price, qty in self.items.values()), 2)

      def __len__(self):
          return sum(qty for price, qty in self.items.values())

  cart = Cart()
  cart.add("tea", 2.5, 2)
  cart.add("cake", 4.5)
  cart.add("tea", 2.5)
  print("Items:", len(cart))
  print("Total:", cart.total())
  cart.remove("cake")
  cart.remove("nothing")
  print("Items:", len(cart))
  print("Total:", cart.total())
explanation: |
  The cart hides *how* items are stored (a dictionary of [price, quantity] lists) behind simple methods. Defining
  `__len__` lets Python's built-in `len()` work with your own class.
check:
  expected: |
    Items: 4
    Total: 12.0
    Items: 3
    Total: 7.5
  tests:
    - name: separate carts are independent
      code: |
        c1, c2 = Cart(), Cart()
        c1.add("x", 1)
        assert len(c2) == 0, "items must be created in __init__, not shared"
```

```quiz
- id: q1
  question: What is the relationship between a class and an object?
  options:
    - A class is a blueprint; an object is a thing built from it
    - They are the same thing
    - An object is a blueprint for classes
    - A class is a kind of loop
  answer: A class is a blueprint; an object is a thing built from it
  explanation: You can create many objects (instances) from one class.
- id: q2
  question: When does `__init__` run?
  options:
    - Automatically, every time a new object is created
    - Only when you call obj.__init__()
    - When the program ends
    - When the class is printed
  answer: Automatically, every time a new object is created
  explanation: It is the constructor that sets up the new object's attributes.
- id: q3
  question: What does `self` refer to inside a method?
  options:
    - The particular object the method was called on
    - The class itself
    - The previous object
    - The whole program
  answer: The particular object the method was called on
  explanation: acc.deposit(50) passes acc as self.
- id: q4
  question: What does this print?
  code: |
    class Dog:
        def __init__(self, name):
            self.name = name
    a = Dog("Rex")
    b = Dog("Fido")
    print(a.name, b.name)
  type: text
  answer: ["Rex Fido"]
  explanation: Each object has its own name attribute.
- id: q5
  question: Which special method controls what `print(obj)` shows?
  type: text
  answer: ["__str__", "str"]
  explanation: print calls str(obj), which uses __str__.
- id: q6
  question: 'A method is defined as `def deposit(amount):` (no self). What happens when you call `acc.deposit(5)`?'
  options:
    - TypeError - the method receives 2 arguments but expects 1
    - It works
    - The balance becomes 5
    - SyntaxError when defining the class
  answer: TypeError - the method receives 2 arguments but expects 1
  explanation: Python always passes the object itself as the first argument.
```
