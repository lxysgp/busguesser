import json as j
services = j.load(open("stop_to_services.json","r",encoding="utf-8"))
stops = j.load(open("stops.json","r",encoding="utf-8"))

for stop in stops:
  stops[stop] = [stops[stop],services[stop]]
j.dump(stops,open("final.json","w",encoding="utf-8"),ensure_ascii=False,indent=2)