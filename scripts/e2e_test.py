import urllib.request, json

base = "http://localhost:3001/api"
headers_auth = {"Content-Type": "application/json"}

req = urllib.request.Request(f"{base}/auth/login", json.dumps({"username":"admin","password":"123456"}).encode(), headers_auth)
token = json.loads(urllib.request.urlopen(req).read())["data"]["token"]
headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}

req = urllib.request.Request(f"{base}/checkin/master-data", headers=headers)
master = json.loads(urllib.request.urlopen(req).read())["data"]

req = urllib.request.Request(f"{base}/schedules/batches", headers=headers)
batches = json.loads(urllib.request.urlopen(req).read())["data"]
theory_batch = [b for b in batches if "理论" in b["name"]][0]

theory_room = [r for r in master["examRooms"] if "理论" in r["name"]][0]
elec_theory = [s for s in master["subjects"] if s["code"] == "ELEC-TH-04"][0]
level4 = [l for l in master["skillLevels"] if l["code"] == "LV4"][0]
proctor = master["proctors"][0]

sched_data = {
    "batch_id": theory_batch["id"],
    "exam_room_id": theory_room["id"],
    "proctor_id": proctor["id"],
    "subject_id": elec_theory["id"],
    "skill_level_id": level4["id"],
    "exam_date": "2026-07-15",
    "start_time": "14:00",
    "end_time": "16:00",
    "capacity": 40
}
req = urllib.request.Request(f"{base}/schedules", json.dumps(sched_data).encode(), headers)
sched_result = json.loads(urllib.request.urlopen(req).read())
sched_id = sched_result["data"]["id"]
print(f"Schedule created: {sched_id}")

req = urllib.request.Request(f"{base}/registrations/pending", headers=headers)
pending = json.loads(urllib.request.urlopen(req).read())["data"]
reg_ids = [r["id"] for r in pending[:3]]
print(f"Assigning {len(reg_ids)} candidates...")

assign_data = {"registration_ids": reg_ids}
req = urllib.request.Request(f"{base}/schedules/{sched_id}/assign", json.dumps(assign_data).encode(), headers)
assign_result = json.loads(urllib.request.urlopen(req).read())
print(f"Assign: success={assign_result['success']}")

if not assign_result["success"]:
    print(f"Errors: {assign_result.get('errors', [])}")
    exit(1)

req = urllib.request.Request(f"{base}/schedules/{sched_id}", headers=headers)
detail = json.loads(urllib.request.urlopen(req).read())["data"]
print(f"\nSchedule: {detail['subject_name']} | {detail['exam_date']} {detail['start_time']}-{detail['end_time']}")
print(f"Room: {detail['room_name']} | Proctor: {detail['proctor_name']}")
print(f"Assigned: {detail['assigned_count']}/{detail['capacity']}")
for s in detail.get("seats", []):
    print(f"  Seat {s['seat_no']}: {s['candidate_name']} ({s['id_card']}) checkin:{s['checkin_status']}")

proctor_token = json.loads(urllib.request.urlopen(urllib.request.Request(f"{base}/auth/login", json.dumps({"username":"proctor1","password":"123456"}).encode(), headers_auth)).read())["data"]["token"]
proctor_headers = {"Content-Type": "application/json", "Authorization": f"Bearer {proctor_token}"}

first_seat = detail["seats"][0]
checkin_data = {"seat_arrangement_id": first_seat["id"], "checkin_method": "manual"}
req = urllib.request.Request(f"{base}/checkin", json.dumps(checkin_data).encode(), proctor_headers)
try:
    checkin_result = json.loads(urllib.request.urlopen(req).read())
    print(f"\nCheckin: success={checkin_result['success']}")
    if checkin_result["success"]:
        d = checkin_result["data"]
        print(f"  Time: {d['checkin_time']} | Late: {d['is_late']} | Late min: {d['late_minutes']}")
except urllib.error.HTTPError as e:
    print(f"\nCheckin error: {json.loads(e.read())}")

req = urllib.request.Request(f"{base}/registrations/{reg_ids[1]}/freeze", json.dumps({"reason":"测试冻结"}).encode(), headers)
freeze_result = json.loads(urllib.request.urlopen(req).read())
print(f"\nFreeze test: success={freeze_result['success']}")

print("\n=== FULL E2E TEST PASSED ===")
