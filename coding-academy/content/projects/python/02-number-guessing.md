---
id: proj-py-02-number-guessing
title: Number guessing game
track: python
order: 2
difficulty: beginner
summary: The computer picks a secret number; you guess with "higher / lower" clues, with a limited number of tries and a score.
internet: false
skills: [py-1-6-input-and-conversion, py-2-2-if-elif-else, py-3-2-while-loops, py-3-3-break-continue-nested, py-8-1-modules-and-stdlib]
demo_input: |
  50
  25
  hello
  75
  q
starter: |
  import random

  secret = random.randint(1, 100)
  guess = int(input("Guess a number from 1 to 100: "))

  # your code here: say "Too low", "Too high" or "Correct!"
stages:
  - name: Beginner
    description: One round of the game.
    tasks:
      - {id: b1, text: "The computer picks a random number from 1 to 100 with random.randint"}
      - {id: b2, text: "The player keeps guessing until they get it right, with 'Too low' / 'Too high' clues"}
      - {id: b3, text: "When the guess is right, it prints how many guesses it took"}
  - name: Intermediate
    description: Rules and robustness.
    tasks:
      - {id: i1, text: "The player has at most 7 guesses; after that the secret number is revealed"}
      - {id: i2, text: "Text or numbers outside 1-100 get a friendly message and don't use up a guess"}
      - {id: i3, text: "Typing q quits the game at any time"}
      - {id: i4, text: "The game logic is in a function, e.g. play_round(secret) returning the number of guesses (or None)"}
  - name: Extension ideas
    required: false
    tasks:
      - {id: e1, text: "Difficulty levels (easy 1-50 / hard 1-1000) with a matching number of guesses"}
      - {id: e2, text: "Play several rounds and keep a best score"}
      - {id: e3, text: "Save the best score to a file so it survives between runs"}
      - {id: e4, text: "Reverse the game: you think of a number and the computer guesses it (binary search!)"}
---

## Goal

A classic first game. It practises loops, conditions, input checking and random numbers - and it's fun to give
to someone else to play.

## Example run

```text
I'm thinking of a number from 1 to 100. You have 7 guesses (q to quit).
Guess 1: 50
Too high!
Guess 2: 25
Too low!
Guess 3: hello
Please type a whole number from 1 to 100.
Guess 3: 37
Correct! You needed 3 guesses.
```

## Step-by-step plan

1. Pick the secret with `random.randint(1, 100)`.
2. Loop: ask for a guess, compare, print a clue; stop with `break` when correct.
3. Count guesses; stop after 7 and reveal the number.
4. Validate input: `text.isdigit()` and the range check; `q` quits.
5. Move a round into `play_round(secret, max_guesses=7)` so you can test it and play many rounds.

## Hints

- `while guesses < max_guesses:` combined with `break` on a correct guess - and an `else:` on the while loop
  runs only if the loop ended *without* `break` (the player ran out of guesses).
- While testing, print the secret number at the start (and remove that line afterwards!) or use
  `random.seed(1)` to get the same "random" number every run.
- In the Python Lab, put your guesses in the input box, one per line, and end with `q` so the game finishes.

## Sample solution

```python
import random


def ask_guess(number, low, high):
    """Ask until the user types a valid guess or q. Returns an int, or None to quit."""
    while True:
        text = input(f"Guess {number}: ").strip().lower()
        if text == "q":
            return None
        if text.isdigit() and low <= int(text) <= high:
            return int(text)
        print(f"Please type a whole number from {low} to {high}.")


def play_round(secret, low=1, high=100, max_guesses=7):
    """Play one round. Returns the number of guesses used, or None if the player lost or quit."""
    print(f"I'm thinking of a number from {low} to {high}. You have {max_guesses} guesses (q to quit).")
    guesses = 0
    while guesses < max_guesses:
        guess = ask_guess(guesses + 1, low, high)
        if guess is None:
            print(f"Bye! The number was {secret}.")
            return None
        guesses += 1
        if guess < secret:
            print("Too low!")
        elif guess > secret:
            print("Too high!")
        else:
            print(f"Correct! You needed {guesses} guesses.")
            return guesses
    print(f"Out of guesses - the number was {secret}.")
    return None


random.seed()            # different number each time
play_round(random.randint(1, 100))
```

## Test your program

Play a few rounds yourself: guess right first time (`random.seed(1)` helps), run out of guesses, type words,
`0`, `101` and `q`. Then ask someone else to play - real users find bugs you never thought of.
