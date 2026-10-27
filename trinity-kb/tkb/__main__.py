"""Command line: python -m tkb <command>

  serve                    start the web app on http://127.0.0.1:8765
  import <file|folder> [--category B]
  search <query>
  web-update [--refresh] [--max N]
  report                   print the document import report and website coverage
  backup | restore <zip> | export <out.jsonl>
  hardware                 inspect this computer and recommend a local AI model
"""
import argparse
import json
import sys
from pathlib import Path

from . import backup, db, ingest, llm, web
from .search import citation, search


def main(argv=None):
    p = argparse.ArgumentParser(prog="tkb")
    sub = p.add_subparsers(dest="cmd")
    s = sub.add_parser("serve"); s.add_argument("--port", type=int, default=8765)
    i = sub.add_parser("import"); i.add_argument("path"); i.add_argument("--category", choices=list("ABCDE"))
    q = sub.add_parser("search"); q.add_argument("query", nargs="+")
    w = sub.add_parser("web-update"); w.add_argument("--refresh", action="store_true"); w.add_argument("--max", type=int)
    sub.add_parser("report"); sub.add_parser("backup"); sub.add_parser("hardware")
    r = sub.add_parser("restore"); r.add_argument("zip")
    e = sub.add_parser("export"); e.add_argument("out")
    a = p.parse_args(argv)
    if a.cmd in (None, "serve"):
        from .app import main as serve
        return serve(getattr(a, "port", 8765))
    conn = db.connect()
    if a.cmd == "import":
        path = Path(a.path)
        res = ingest.import_folder(conn, path, a.category) if path.is_dir() else [ingest.import_file(conn, path, a.category)]
        for x in res:
            print(f"{x['status']:<12} {x['name']}: {x['message']}")
            for wn in x.get("warnings") or []:
                print(f"{'':13}warning: {wn}")
    elif a.cmd == "search":
        for r in search(conn, " ".join(a.query)):
            print(f"- {citation(r)['text']}\n  {r['text'][:300]!r}\n")
    elif a.cmd == "web-update":
        try:
            res = web.run_update(conn, refresh=a.refresh, max_pages=a.max, progress=lambda n, u: print(f"[{n}] {u}"))
            print(res["message"])
        except web.CrawlBlocked as ex:
            print(ex); return 2
    elif a.cmd == "report":
        for r in ingest.import_report(conn):
            print(f"{r['status']:<17} {r['passages']:>5} passages  {r['name']}  [{r['category']}]")
            for wn in r["warnings"]:
                print(f"{'':25}warning: {wn}")
        cov = web.coverage_report(conn)
        print("\nWebsite:", json.dumps({k: v for k, v in cov.items() if k not in ('problems',)}, indent=2))
    elif a.cmd == "backup":
        print(backup.create_backup(conn))
    elif a.cmd == "restore":
        conn.close(); print("Restored. Safety copy of previous data:", backup.restore_backup(a.zip))
    elif a.cmd == "export":
        print(backup.export_jsonl(conn, Path(a.out)))
    elif a.cmd == "hardware":
        print(json.dumps(llm.hardware(), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
