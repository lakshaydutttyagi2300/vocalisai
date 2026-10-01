import { describe, expect, it } from "vitest";
import { CATEGORIES, RETIRED, SUBJECTS, examLinks, mockMinutes } from "../../prisma/catalogue/content.mjs";
import { catalogueStatements } from "../../prisma/catalogue/sql.mjs";

const exams = CATEGORIES.flatMap((c) => c.exams.map((e) => ({ ...e, category: c.slug })));
const subjectSlugs = new Set(SUBJECTS.map((s) => s.slug));

describe("exam catalogue content (private-sector hiring)", () => {
  it("offers no government recruitment exams", () => {
    const government = /\b(SSC|IBPS|SBI|RBI|NABARD|UPSC|PSC|RRB|Railway|NDA|CDS|AFCAT|Agniveer|Police|CTET|TET|KVS|DSSSB|UGC|CUET|JEE|NEET|GATE|CLAT|LIC|EPFO|FCI|NIACL)\b/i;
    for (const c of CATEGORIES) {
      expect(c.name, c.slug).not.toMatch(/government|banking exams|ssc|railway|upsc|state government|police|defence|teaching/i);
      for (const e of c.exams) expect(`${e.name} ${e.keywords ?? ""}`, e.slug).not.toMatch(government);
    }
    for (const retired of RETIRED.categories) expect(CATEGORIES.map((c) => c.slug)).not.toContain(retired);
  });

  it("has the hiring structure: providers and companies, with TCS NQT once", () => {
    const hiring = CATEGORIES.find((c) => c.slug === "company-hiring-assessments")!;
    expect(CATEGORIES[0]).toBe(hiring);
    const byGroup = (g: string) => hiring.exams.filter((e) => e.group === g).map((e) => e.name);
    expect(byGroup("Assessment providers")).toEqual(expect.arrayContaining(["AMCAT", "eLitmus (pH Test)", "CoCubes", "TCS iON Assessments", "SHL Assessments", "Mercer | Mettl Assessments", "HirePro Assessments"]));
    expect(byGroup("Company assessments")).toEqual(
      expect.arrayContaining(["TCS NQT", "Infosys", "Accenture", "Cognizant (GenC)", "Wipro (NLTH, Elite)", "Capgemini", "Deloitte", "EY", "KPMG", "PwC", "Tech Mahindra", "HCLTech"])
    );
    expect(exams.filter((e) => /tcs nqt/i.test(e.name))).toHaveLength(1);
    expect(exams.find((e) => e.slug === "cat")?.category).toBe("career-entrance");
  });

  it("features private-sector assessments only", () => {
    const featured = exams.filter((e) => e.popular).map((e) => e.slug);
    expect(featured).toEqual(expect.arrayContaining(["amcat", "elitmus", "cocubes", "tcs-nqt", "infosys", "accenture", "cognizant", "wipro", "capgemini", "general-aptitude", "situational-judgement-test"]));
  });

  it("links every section to a real, non-coding subject", () => {
    for (const e of exams) {
      expect(e.sections.length, e.slug).toBeGreaterThan(0);
      const links = examLinks(e);
      expect(new Set(links.map((l) => l.subject)).size, e.slug).toBe(links.length);
      for (const l of links) {
        expect(subjectSlugs.has(l.subject), `${e.slug}: ${l.subject}`).toBe(true);
        expect(RETIRED.subjects, `${e.slug}: ${l.subject}`).not.toContain(l.subject);
      }
      expect(mockMinutes(e)).toBeGreaterThan(0);
    }
    expect([...subjectSlugs].join(" ")).not.toMatch(/programming|coding|technical/);
  });

  it("uses unique slugs", () => {
    const all = (list: string[]) => expect(new Set(list).size).toBe(list.length);
    all(CATEGORIES.map((c) => c.slug));
    all(exams.map((e) => e.slug));
    all(SUBJECTS.map((s) => s.slug));
  });

  it("builds create-only and sync SQL; only sync retires anything", () => {
    const create = catalogueStatements("create").join("\n");
    const sync = catalogueStatements("sync").join("\n");
    expect(create).not.toMatch(/"isActive" = false/);
    expect(create).not.toMatch(/DELETE/);
    expect(sync).toMatch(/UPDATE "CatalogCategory" SET "isActive" = false/);
    expect(sync).toMatch(/'ssc'/);
    expect(sync).not.toMatch(/DELETE FROM "Catalog(Category|Exam|Subject|Skill)"/); // only exam-subject links are replaced
  });
});
