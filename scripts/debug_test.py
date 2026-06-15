import urllib.request, json

base = "http://localhost:3001/api"
headers_auth = {"Content-Type": "application/json"}

req = urllib.request.Request(f"{base}/auth/login", json.dumps({"username":"admin","password":"123456"}).encode(), headers_auth)
token = json.loads(urllib.request.urlopen(req).read())["data"]["token"]
headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}

# 获取批次
req = urllib.request.Request(f"{base}/schedules/batches", headers=headers)
batches = json.loads(urllib.request.urlopen(req).read())["data"]
print(f"Batches: {[b['name'] for b in batches]}")
theory_batch = [b for b in batches if "理论" in b["name"]][0]

# 获取master data
req = urllib.request.Request(f"{base}/checkin/master-data", headers=headers)
master = json.loads(urllib.request.urlopen(req).read())["data"]

print(f"\nExam Rooms: {[(r['id'], r['name']) for r in master['examRooms']]}")
print(f"\nSubjects: {[(s['id'], s['code'], s['name']) for s in master['subjects']]}")
print(f"\nSkill Levels: {[(l['id'], l['code'], l['name']) for l in master['skillLevels']]}")
print(f"\nProctors: {[(p['id'], p['name']) for p in master['proctors']]}")

theory_room = [r for r in master["examRooms"] if "理论" in r["name"]][0]
elec_theory = [s for s in master["subjects"] if s["code"] == "ELEC-TH-04"][0]
level4 = [l for l in master["skillLevels"] if l["code"] == "LV4"][0]
proctor = master["proctors"][0]

print(f"\nSelected IDs:")
print(f"  batch_id: {theory_batch['id']} ({theory_batch['name']})")
print(f"  exam_room_id: {theory_room['id']} ({theory_room['name']})")
print(f"  subject_id: {elec_theory['id']} ({elec_theory['name']})")
print(f"  skill_level_id: {level4['id']} ({level4['name']})")
print(f"  proctor_id: {proctor['id']} ({proctor['name']})")

sched_data = {
    "batch_id": theory_batch["id"],
    "exam_room_id": theory_room["id"],
    "proctor_id": proctor["id"],
    "subject_id": elec_theory["id"],
    "skill_level_id": level4["id"],
    "exam_date": "2026-06-22",
    "start_time": "09:00",
    "end_time": "11:00",
    "capacity": 40
}

print(f"\nCreating schedule with: {json.dumps(sched_data, indent=2)}")

req = urllib.request.Request(f"{base}/schedules", json.dumps(sched_data).encode(), headers)
try:
    sched_result = json.loads(urllib.request.urlopen(req).read())
    print(f"\nSuccess: {json.dumps(sched_result, indent=2)}")
except urllib.error.HTTPError as e:
    print(f"\nError: HTTP {e.code}")
    print(json.dumps(json.loads(e.read()), indent=2))
