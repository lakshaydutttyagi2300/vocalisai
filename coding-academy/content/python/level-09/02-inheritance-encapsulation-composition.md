---
id: py-9-2-inheritance-encapsulation-composition
title: Inheritance, encapsulation and composition
track: python
level: 9
order: 2
minutes: 50
summary: Build on existing classes with inheritance, protect an object's data with encapsulation and properties, and assemble objects from other objects with composition.
objectives:
  - Create a subclass that inherits and extends a parent class
  - Override methods and call the parent version with super()
  - Protect internal data with naming conventions and @property
  - Build objects out of other objects (composition)
  - Choose between inheritance ("is a") and composition ("has a")
prerequisites: [py-9-1-classes-objects]
tags: [inheritance, subclass, super, override, encapsulation, property, private, composition, is-a, has-a, polymorphism]
---

## Simple explanation

**Inheritance** lets a new class **reuse and extend** an existing one:

```python
class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        return "..."

class Dog(Animal):              # Dog inherits from Animal
    def speak(self):            # override: replace the parent's version
        return "Woof"

print(Dog("Rex").name, Dog("Rex").speak())   # Rex Woof
```

`Dog` got `__init__` and `name` for free from `Animal`, and replaced `speak`.

**Encapsulation** means an object **protects its own data**: outside code uses methods, not internal details. In
Python, a leading underscore (`self._balance`) says "internal - please don't touch", and `@property` lets you
control how an attribute is read or changed.

**Composition** means building an object **out of other objects**: a `Car` *has an* `Engine`; a `Library` *has*
`Book`s.

## Real-world analogy

- **Inheritance**: an *electric car* **is a** car - it does everything a car does, plus charging, and its
  "refuel" works differently (override).
- **Encapsulation**: a **coffee machine** has buttons (methods). You don't open the boiler and pour water on the
  heating element yourself - the machine protects its insides.
- **Composition**: a **computer has a** keyboard, a screen and a disk. It is not *a kind of* keyboard.

## Technical definition

- `class Child(Parent):` - Child inherits all attributes and methods of Parent. Lookup goes Child → Parent →
  ... → `object` (the method resolution order).
- **Overriding**: defining a method with the same name in the child. `super().method(...)` calls the parent's
  version - commonly `super().__init__(...)` inside the child's `__init__`.
- `isinstance(obj, Class)` is True for the class and its parents; `issubclass(Child, Parent)`.
- **Polymorphism**: different classes provide the same method name, so code can call `shape.area()` without
  knowing which shape it has.
- **Encapsulation conventions**: `_name` = internal (by agreement); `__name` = name-mangled to `_Class__name` to
  avoid clashes in subclasses (not true privacy). Python relies on convention, not enforcement.
- `@property` turns a method into a read-only attribute; `@name.setter` adds validated assignment.
- **Composition**: store other objects as attributes and delegate work to them. Rule of thumb: inheritance for
  **is-a** relationships, composition for **has-a** - and prefer composition when unsure.

## Step-by-step examples

**Example 1 - extending with super()**

```python
class Employee:
    def __init__(self, name, salary):
        self.name = name
        self.salary = salary

    def yearly_cost(self):
        return self.salary

class Manager(Employee):
    def __init__(self, name, salary, bonus):
        super().__init__(name, salary)     # let Employee set name and salary
        self.bonus = bonus

    def yearly_cost(self):
        return super().yearly_cost() + self.bonus

staff = [Employee("Asha", 50000), Manager("Ben", 70000, 10000)]
for person in staff:
    print(person.name, person.yearly_cost())
```

Output: `Asha 50000` and `Ben 80000`. The loop calls `yearly_cost()` on both without checking their type -
polymorphism.

**Example 2 - encapsulation with a property**

```python
class Thermostat:
    def __init__(self, celsius):
        self._celsius = celsius            # internal

    @property
    def celsius(self):
        return self._celsius

    @celsius.setter
    def celsius(self, value):
        if not 5 <= value <= 30:
            raise ValueError("Temperature must be 5-30 °C")
        self._celsius = value

    @property
    def fahrenheit(self):                  # computed, read-only
        return self._celsius * 9 / 5 + 32

t = Thermostat(20)
t.celsius = 22           # goes through the setter (validated)
print(t.fahrenheit)      # 71.6
t.celsius = 90           # ValueError: Temperature must be 5-30 °C
```

**Example 3 - composition**

```python
class Engine:
    def __init__(self, horsepower):
        self.horsepower = horsepower
        self.running = False

    def start(self):
        self.running = True

class Car:
    def __init__(self, model, horsepower):
        self.model = model
        self.engine = Engine(horsepower)    # a Car HAS an Engine

    def start(self):
        self.engine.start()                 # delegate to the part
        return f"{self.model} started ({self.engine.horsepower} hp)"

print(Car("Mini", 136).start())             # Mini started (136 hp)
```

## Common mistakes

- **Forgetting `super().__init__(...)`** in a subclass's `__init__` → parent attributes are never set
  (`AttributeError` later).
- **Inheritance for "has-a"** relationships (`class Car(Engine)`) - leads to confusing designs. Use composition.
- **Deep inheritance chains** (5+ levels) - hard to follow. Keep hierarchies shallow.
- **Reaching into internals** (`account._balance = -500`) - bypasses the rules; use methods/properties.
- **Calling a property like a method**: `t.fahrenheit()` → TypeError; it is accessed like an attribute.

## Practical application

Inheritance appears in frameworks (you subclass a framework's class and override a few methods - e.g. custom
exceptions: `class InsufficientFunds(ValueError): ...`). Encapsulation keeps data valid (a bank balance that can
never go negative). Composition models real systems: an `Order` has `OrderLine`s and a `Customer`; a `Report`
has a data loader and a formatter.

## Revision notes

- `class Child(Parent):` inherits; override by redefining a method; `super().method()` calls the parent's.
- Polymorphism: same method name, different classes - call it without checking the type.
- Encapsulation: `_internal` by convention; `@property` for computed/validated attributes.
- Composition: objects contain other objects and delegate to them.
- **is-a** → inheritance; **has-a** → composition (prefer composition when unsure).

```exercise
id: shapes-inheritance
title: Shapes with inheritance
difficulty: beginner
instructions: |
  `Shape` is the parent class. Create subclasses `Square(side)` and `Circle(radius)` that each override
  `area()`. `Circle.area()` returns `round(3.14159 * radius ** 2, 2)`. The starter loop prints every shape's
  name and area using polymorphism:

  ```text
  square 16
  circle 12.57
  shape 0
  ```
starter: |
  class Shape:
      name = "shape"

      def area(self):
          return 0

  # write Square and Circle here

  for shape in [Square(4), Circle(2), Shape()]:
      print(shape.name, shape.area())
hints:
  - "`class Square(Shape):` with `name = \"square\"`, an `__init__(self, side)` storing `self.side`, and `def area(self): return self.side ** 2`."
  - "Circle is similar with `radius`."
solution: |
  class Shape:
      name = "shape"

      def area(self):
          return 0

  class Square(Shape):
      name = "square"

      def __init__(self, side):
          self.side = side

      def area(self):
          return self.side ** 2

  class Circle(Shape):
      name = "circle"

      def __init__(self, radius):
          self.radius = radius

      def area(self):
          return round(3.14159 * self.radius ** 2, 2)

  for shape in [Square(4), Circle(2), Shape()]:
      print(shape.name, shape.area())
explanation: |
  Each subclass inherits from Shape and overrides `area` and the `name` class attribute. The loop treats every
  shape the same way - that is polymorphism.
check:
  expected: |
    square 16
    circle 12.57
    shape 0
  tests:
    - name: Square and Circle are Shapes
      code: |
        assert isinstance(Square(1), Shape) and isinstance(Circle(1), Shape)
```

```exercise
id: super-init
title: Extend a class with super()
difficulty: beginner
instructions: |
  `SavingsAccount` should inherit from `Account`, take an extra `rate` argument, and have a method
  `add_interest()` that adds `balance * rate` to the balance. Use `super().__init__` so `Account` still sets the
  owner and balance.

  ```text
  Asha 1050.0
  ```
starter: |
  class Account:
      def __init__(self, owner, balance):
          self.owner = owner
          self.balance = balance

  class SavingsAccount(Account):
      pass

  acc = SavingsAccount("Asha", 1000, 0.05)
  acc.add_interest()
  print(acc.owner, acc.balance)
hints:
  - "`def __init__(self, owner, balance, rate):` then `super().__init__(owner, balance)` and `self.rate = rate`."
  - "`def add_interest(self): self.balance += self.balance * self.rate`"
solution: |
  class Account:
      def __init__(self, owner, balance):
          self.owner = owner
          self.balance = balance

  class SavingsAccount(Account):
      def __init__(self, owner, balance, rate):
          super().__init__(owner, balance)
          self.rate = rate

      def add_interest(self):
          self.balance += self.balance * self.rate

  acc = SavingsAccount("Asha", 1000, 0.05)
  acc.add_interest()
  print(acc.owner, acc.balance)
explanation: |
  `super().__init__(owner, balance)` reuses the parent's setup instead of copying it. The child only adds what is
  new: the rate and the interest method.
check:
  expected: |
    Asha 1050.0
  require_text: ["super()"]
```

```exercise
id: temperature-property
title: Validate with a property
difficulty: intermediate
instructions: |
  Complete `Person` so that `age` is a **property**: reading `p.age` returns the stored `_age`; setting
  `p.age = value` raises `ValueError("Invalid age")` unless the value is an int from 0 to 130. The constructor
  must also use the validation (assign `self.age = age` in `__init__`).

  ```text
  30
  31
  Error: Invalid age
  31
  ```
starter: |
  class Person:
      def __init__(self, name, age):
          self.name = name
          self.age = age

  p = Person("Asha", 30)
  print(p.age)
  p.age = 31
  print(p.age)
  try:
      p.age = -4
  except ValueError as err:
      print("Error:", err)
  print(p.age)
hints:
  - "Add `@property` above `def age(self): return self._age`."
  - "Add `@age.setter` above `def age(self, value):` - validate, then `self._age = value`."
solution: |
  class Person:
      def __init__(self, name, age):
          self.name = name
          self.age = age

      @property
      def age(self):
          return self._age

      @age.setter
      def age(self, value):
          if not isinstance(value, int) or not 0 <= value <= 130:
              raise ValueError("Invalid age")
          self._age = value

  p = Person("Asha", 30)
  print(p.age)
  p.age = 31
  print(p.age)
  try:
      p.age = -4
  except ValueError as err:
      print("Error:", err)
  print(p.age)
explanation: |
  Because `__init__` assigns through the property, even the first value is validated. The invalid assignment is
  rejected before `_age` changes, so the object stays valid.
check:
  expected: |
    30
    31
    Error: Invalid age
    31
  tests:
    - name: the constructor validates too
      code: |
        try:
            Person("X", 500)
            raise AssertionError("Person('X', 500) should raise ValueError")
        except ValueError:
            pass
  requires: [decorator]
```

```exercise
id: library-composition
title: A library built with composition
difficulty: challenge
instructions: |
  Build two classes:

  - `Book(title, author)` with an attribute `available = True`.
  - `Library` that **has** a list of books (`self.books`, empty at the start) and methods:
    - `add(book)`
    - `lend(title)` - marks the first available book with that title as not available and returns `True`, or
      returns `False` if no available copy exists
    - `available_titles()` - a sorted list of titles of available books

  ```text
  ['Dune', 'Emma', 'Emma']
  True True False
  ['Dune']
  ```
starter: |
  class Book:
      pass

  class Library:
      pass

  lib = Library()
  lib.add(Book("Emma", "Jane Austen"))
  lib.add(Book("Dune", "Frank Herbert"))
  lib.add(Book("Emma", "Jane Austen"))
  print(lib.available_titles())
  print(lib.lend("Emma"), lib.lend("Emma"), lib.lend("Emma"))
  print(lib.available_titles())
hints:
  - "Book: `__init__` stores title and author and sets `self.available = True`."
  - "lend: loop over `self.books`; if `book.title == title and book.available:` set it False and `return True`. After the loop `return False`."
  - "`sorted(book.title for book in self.books if book.available)`"
solution: |
  class Book:
      def __init__(self, title, author):
          self.title = title
          self.author = author
          self.available = True

  class Library:
      def __init__(self):
          self.books = []

      def add(self, book):
          self.books.append(book)

      def lend(self, title):
          for book in self.books:
              if book.title == title and book.available:
                  book.available = False
                  return True
          return False

      def available_titles(self):
          return sorted(book.title for book in self.books if book.available)

  lib = Library()
  lib.add(Book("Emma", "Jane Austen"))
  lib.add(Book("Dune", "Frank Herbert"))
  lib.add(Book("Emma", "Jane Austen"))
  print(lib.available_titles())
  print(lib.lend("Emma"), lib.lend("Emma"), lib.lend("Emma"))
  print(lib.available_titles())
explanation: |
  A Library *has* Books - composition. Each Book keeps its own `available` state, and the Library coordinates them.
  Inheritance (`class Library(Book)`) would make no sense: a library is not a kind of book.
check:
  expected: |
    ['Dune', 'Emma', 'Emma']
    True True False
    ['Dune']
  tests:
    - name: each library has its own book list
      code: |
        a, b = Library(), Library()
        a.add(Book("X", "Y"))
        assert b.available_titles() == []
```

```quiz
- id: q1
  question: In `class Dog(Animal):`, what is Animal?
  options:
    - The parent (base) class that Dog inherits from
    - An attribute of Dog
    - A method
    - A module
  answer: The parent (base) class that Dog inherits from
  explanation: Dog gets all of Animal's methods and can override or add to them.
- id: q2
  question: What does `super().__init__(name)` do inside a child's `__init__`?
  options:
    - Runs the parent's __init__ so it can set up its attributes
    - Creates a second object
    - Deletes the parent class
    - Calls the child's __init__ again
  answer: Runs the parent's __init__ so it can set up its attributes
  explanation: It reuses the parent's setup code instead of copying it.
- id: q3
  question: Which relationship suits composition rather than inheritance?
  options:
    - A Car has an Engine
    - A Dog is an Animal
    - A Manager is an Employee
    - A Square is a Shape
  answer: A Car has an Engine
  explanation: has-a → composition; is-a → inheritance.
- id: q4
  question: What does a leading underscore, as in `self._balance`, mean in Python?
  options:
    - By convention, it is internal and should not be used from outside the class
    - Python makes it completely invisible
    - It is a syntax error
    - It makes the attribute a constant
  answer: By convention, it is internal and should not be used from outside the class
  explanation: Python relies on convention rather than enforced privacy.
- id: q5
  question: What is polymorphism?
  options:
    - Different classes providing the same method name, so code can use them interchangeably
    - A class with many attributes
    - Copying an object
    - A loop over classes
  answer: Different classes providing the same method name, so code can use them interchangeably
  explanation: shape.area() works for squares and circles alike.
- id: q6
  question: How do you read a property called `fahrenheit` on object t?
  options:
    - t.fahrenheit
    - t.fahrenheit()
    - t[fahrenheit]
    - fahrenheit(t)
  answer: t.fahrenheit
  explanation: Properties are accessed like attributes, without brackets.
```
