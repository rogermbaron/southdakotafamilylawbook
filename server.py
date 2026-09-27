#!/usr/bin/env python3
import json,sqlite3,urllib.parse,os
from http.server import HTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
ROOT=Path(__file__).parent
DB=ROOT/"Baron_Family_Law_2010_Stage_4B.sqlite"

def fts_query(q):
    # FTS5 treats punctuation as syntax; quote user input as a literal phrase.
    # First try normal syntax for ordinary searches, then literal phrase fallback.
    return q, '"'+q.replace('"','""')+'"'

class H(SimpleHTTPRequestHandler):
 def do_GET(self):
  u=urllib.parse.urlparse(self.path)
  if u.path=="/api/search":
   q=urllib.parse.parse_qs(u.query).get("q",[""])[0].strip(); con=sqlite3.connect(DB)
   try:
    sql="""SELECT w.printed_page,w.master_pdf_page,w.chapter_title,w.section_heading,
      snippet(web_pages_fts,0,'<mark>','</mark>',' … ',18),rank
      FROM web_pages_fts JOIN web_pages w ON w.id=web_pages_fts.rowid
      WHERE web_pages_fts MATCH ? ORDER BY rank LIMIT 50"""
    try: rows=con.execute(sql,(fts_query(q)[0],)).fetchall()
    except sqlite3.OperationalError: rows=con.execute(sql,(fts_query(q)[1],)).fetchall()
    auth=con.execute("""SELECT authority,authority_type,first_page,pages FROM authorities
      WHERE lower(authority) LIKE lower(?) ORDER BY first_page LIMIT 20""",(f"%{q}%",)).fetchall()
    self.json({"results":[dict(zip(["printed_page","master_pdf_page","chapter_title","section_heading","snippet","rank"],r)) for r in rows],"authorities":[dict(zip(["authority","type","first_page","pages"],r)) for r in auth]})
   except sqlite3.OperationalError as e: self.json({"results":[],"authorities":[],"message":str(e)})
   finally: con.close()
   return
  if u.path=="/api/index-search":
   q=urllib.parse.parse_qs(u.query).get("q",[""])[0].strip(); con=sqlite3.connect(DB)
   try:
    sql="""SELECT w.printed_page,w.master_pdf_page,w.chapter_title,w.section_heading,
      snippet(web_pages_fts,0,'<mark>','</mark>',' … ',24),rank
      FROM web_pages_fts JOIN web_pages w ON w.id=web_pages_fts.rowid
      WHERE web_pages_fts MATCH ? AND w.page_type='index' ORDER BY rank LIMIT 100"""
    try: rows=con.execute(sql,(fts_query(q)[0],)).fetchall()
    except sqlite3.OperationalError: rows=con.execute(sql,(fts_query(q)[1],)).fetchall()
    self.json({"results":[dict(zip(["printed_page","master_pdf_page","chapter_title","section_heading","snippet","rank"],r)) for r in rows]})
   except sqlite3.OperationalError as e: self.json({"results":[],"message":str(e)})
   finally: con.close()
   return
  if u.path=="/api/authority":
   q=urllib.parse.parse_qs(u.query).get("q",[""])[0].strip(); con=sqlite3.connect(DB)
   rows=con.execute("select authority,authority_type,first_page,pages,verification_status,review_flag from authorities where lower(authority) like lower(?) order by first_page limit 50",(f"%{q}%",)).fetchall(); con.close()
   self.json({"authorities":[dict(zip(["authority","type","first_page","pages","verification_status","review_flag"],r)) for r in rows]}); return
  if u.path=="/api/page":
   p=urllib.parse.parse_qs(u.query).get("p",[""])[0]; con=sqlite3.connect(DB)
   r=con.execute("select printed_page,master_pdf_page,page_type,chapter_number,chapter_title,section_heading from web_pages where printed_page=?",(p,)).fetchone(); con.close()
   self.json({"page":None if not r else dict(zip(["printed_page","master_pdf_page","page_type","chapter_number","chapter_title","section_heading"],r))}); return
  super().do_GET()
 def json(self,obj):
  raw=json.dumps(obj,ensure_ascii=False).encode(); self.send_response(200); self.send_header("Content-Type","application/json; charset=utf-8"); self.send_header("Content-Length",str(len(raw))); self.end_headers(); self.wfile.write(raw)

port=int(os.environ.get("PORT","8000"))
HTTPServer(("0.0.0.0",port),H).serve_forever()
