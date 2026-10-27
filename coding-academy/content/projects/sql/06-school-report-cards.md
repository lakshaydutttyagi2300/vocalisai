---
id: proj-sql-06-school-report-cards
title: School report cards (multi-table joins)
track: sql
order: 6
difficulty: intermediate
summary: Combine students, courses and enrolments to produce report cards, course statistics, teacher workloads and lists of students who need support.
dataset: school
internet: false
skills: [sql-4-1-inner-join, sql-4-2-left-join-and-nulls, sql-4-3-self-joins-and-multiple-joins, sql-5-1-case-and-conditional-aggregation, sql-6-1-ranking-window-functions]
stages:
  - name: Beginner
    description: Joining three tables.
    tasks:
      - {id: b1, text: "A report card: every enrolment with student name, course title, term, score and grade"}
      - {id: b2, text: "Each student's number of courses and average score (graded courses only)"}
      - {id: b3, text: "Every course with its number of enrolled students, including courses with none"}
  - name: Intermediate
    description: Insights for teachers.
    tasks:
      - {id: i1, text: "Course statistics per term: students, average, best and worst score, number of fails (< 40)"}
      - {id: i2, text: "Teacher workload: courses taught, total students, total credits"}
      - {id: i3, text: "Students who need support: average below 50 or any fail"}
      - {id: i4, text: "Top student per course (by score) using a window function"}
  - name: Extension ideas
    required: false
    tasks:
      - {id: e1, text: "Students who took both Databases and Statistics (INTERSECT)"}
      - {id: e2, text: "Weighted average by credits per student"}
      - {id: e3, text: "Pairs of students who share at least two courses (self-join on enrolments)"}
---

## Goal

Three tables, many questions. This project trains the most important SQL skill - joining correctly - on data
everyone understands: students, courses and results.

## Hints

- `enrollments` links students and courses: join it to both.
- Ungraded enrolments have `score IS NULL` - `AVG(score)` ignores them automatically, `COUNT(score)` counts only
  graded ones.
- Courses with no students: start `FROM courses` and LEFT JOIN enrollments.
- Top per course: `RANK() OVER (PARTITION BY course_id ORDER BY score DESC)` in a CTE, then `WHERE rnk = 1`
  (RANK keeps ties).

## Sample solution

```sql
-- 1. Report card lines
SELECT s.first_name || ' ' || s.last_name AS student, c.title AS course, e.term, e.score, e.grade
FROM enrollments AS e
JOIN students AS s ON s.id = e.student_id
JOIN courses AS c ON c.id = e.course_id
ORDER BY student, e.term, course;
```

```sql
-- 2. Per student
SELECT s.id, s.first_name, s.last_name,
       COUNT(e.id) AS courses, COUNT(e.score) AS graded, ROUND(AVG(e.score), 1) AS avg_score
FROM students AS s
LEFT JOIN enrollments AS e ON e.student_id = s.id
GROUP BY s.id, s.first_name, s.last_name
ORDER BY avg_score DESC;
```

```sql
-- 3. Every course, including empty ones
SELECT c.title, COUNT(e.id) AS enrolments
FROM courses AS c
LEFT JOIN enrollments AS e ON e.course_id = c.id
GROUP BY c.id, c.title
ORDER BY enrolments DESC, c.title;
```

```sql
-- 4. Course statistics per term
SELECT c.title, e.term, COUNT(*) AS students, ROUND(AVG(e.score), 1) AS average,
       MAX(e.score) AS best, MIN(e.score) AS worst,
       SUM(CASE WHEN e.score < 40 THEN 1 ELSE 0 END) AS fails
FROM enrollments AS e
JOIN courses AS c ON c.id = e.course_id
GROUP BY c.title, e.term
ORDER BY c.title, e.term;
```

```sql
-- 5. Teacher workload
SELECT COALESCE(c.teacher, '(no teacher yet)') AS teacher,
       COUNT(DISTINCT c.id) AS courses,
       COUNT(e.id) AS student_places,
       (SELECT SUM(credits) FROM courses AS c2 WHERE c2.teacher IS c.teacher) AS credits
FROM courses AS c
LEFT JOIN enrollments AS e ON e.course_id = c.id
GROUP BY c.teacher
ORDER BY student_places DESC;
```

```sql
-- 6. Students who need support
SELECT s.first_name, s.last_name, ROUND(AVG(e.score), 1) AS avg_score,
       SUM(CASE WHEN e.score < 40 THEN 1 ELSE 0 END) AS fails
FROM students AS s
JOIN enrollments AS e ON e.student_id = s.id
GROUP BY s.id, s.first_name, s.last_name
HAVING AVG(e.score) < 50 OR SUM(CASE WHEN e.score < 40 THEN 1 ELSE 0 END) > 0
ORDER BY avg_score;
```

```sql
-- 7. Top student per course
WITH ranked AS (
    SELECT e.course_id, e.student_id, e.score,
           RANK() OVER (PARTITION BY e.course_id ORDER BY e.score DESC) AS rnk
    FROM enrollments AS e
    WHERE e.score IS NOT NULL
)
SELECT c.title, s.first_name || ' ' || s.last_name AS student, r.score
FROM ranked AS r
JOIN courses AS c ON c.id = r.course_id
JOIN students AS s ON s.id = r.student_id
WHERE r.rnk = 1
ORDER BY c.title, student;
```

## Check your work

Query 3's enrolments must add up to the number of rows in `enrollments` (62). In query 5, notice why credits
use a subquery: summing `c.credits` after joining enrolments would count each course once **per student** - the
double-counting trap from Level 4.
