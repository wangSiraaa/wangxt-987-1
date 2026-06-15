#!/bin/bash
set -e

cd /Users/mingyuan/workspace/sihuo/wangxtw3/987

# 登录获取 token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"123456"}')
TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
echo "登录成功，TOKEN: $TOKEN"
echo ""

# 更新监考老师
PROCTOR_ID=$(sqlite3 data/exam_scheduler.db "SELECT id FROM users WHERE username = 'proctor1';")
sqlite3 data/exam_scheduler.db "UPDATE exam_schedules SET proctor_id = '$PROCTOR_ID';"
echo "已更新监考老师ID为: $PROCTOR_ID"
echo ""

# 获取待分配名单
echo "=== 1. 获取待分配名单 ==="
PENDING=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/registrations/pending)
echo "$PENDING" | python3 -c "
import sys, json
data = json.load(sys.stdin)
regs = data['data']
print(f'待分配人数: {len(regs)}')
for i, r in enumerate(regs[:5]):
    print(f'  [{i+1}] id={r[\"id\"]}, name={r[\"candidate_name\"]}, subject={r[\"subject_name\"]}')
with open('/tmp/reg_ids.txt', 'w') as f:
    f.write('\n'.join([r['id'] for r in regs[:3]]))
"
echo ""

# 获取排考列表
echo "=== 2. 获取排考列表 ==="
SCHEDULES=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/schedules)
echo "$SCHEDULES" | python3 -c "
import sys, json
data = json.load(sys.stdin)
scheds = data['data']
print(f'排考场次数: {len(scheds)}')
for i, s in enumerate(scheds[:2]):
    print(f'  [{i+1}] id={s[\"id\"]}, date={s[\"exam_date\"]} {s[\"start_time\"]}-{s[\"end_time\"]}, capacity={s[\"capacity\"]}')
with open('/tmp/sched_ids.txt', 'w') as f:
    f.write('\n'.join([s['id'] for s in scheds[:2]]))
"
echo ""

# 读取测试用的ID
REG1=$(head -1 /tmp/reg_ids.txt)
REG2=$(sed -n '2p' /tmp/reg_ids.txt)
REG3=$(sed -n '3p' /tmp/reg_ids.txt)
SCHED1=$(head -1 /tmp/sched_ids.txt)

echo "测试数据:"
echo "  REG1 = $REG1"
echo "  REG2 = $REG2"
echo "  REG3 = $REG3"
echo "  SCHED1 = $SCHED1"
echo ""

# 测试场景3: 先验证（应该通过）
echo "=== 3. 验证接口（REG1, REG2 分配到 SCHED1，应该通过） ==="
VALIDATE1=$(curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -X POST http://localhost:3001/api/schedules/validate \
  -d "{\"registration_ids\": [\"$REG1\", \"$REG2\"], \"target_schedule_id\": \"$SCHED1\"}")
echo "$VALIDATE1" | python3 -m json.tool
echo ""

# 测试场景4: 分配前数据库状态
echo "=== 4. 分配前数据库状态 ==="
SEAT_BEFORE=$(sqlite3 data/exam_scheduler.db "SELECT COUNT(*) FROM seat_arrangements WHERE status != 'cancelled';")
SNAP_BEFORE=$(sqlite3 data/exam_scheduler.db "SELECT COUNT(*) FROM exam_snapshots;")
echo "  seat_arrangements: $SEAT_BEFORE"
echo "  exam_snapshots: $SNAP_BEFORE"
echo ""

# 测试场景5: 成功分配
echo "=== 5. 成功分配 REG1, REG2 到 SCHED1 ==="
ASSIGN1=$(curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -X POST http://localhost:3001/api/schedules/$SCHED1/assign \
  -d "{\"registration_ids\": [\"$REG1\", \"$REG2\"]}")
echo "$ASSIGN1" | python3 -m json.tool
echo ""

# 测试场景6: 分配后数据库状态
echo "=== 6. 分配后数据库状态 ==="
SEAT_AFTER=$(sqlite3 data/exam_scheduler.db "SELECT COUNT(*) FROM seat_arrangements WHERE status != 'cancelled';")
SNAP_AFTER=$(sqlite3 data/exam_scheduler.db "SELECT COUNT(*) FROM exam_snapshots;")
echo "  seat_arrangements: $SEAT_AFTER (增加了 $((SEAT_AFTER - SEAT_BEFORE)))"
echo "  exam_snapshots: $SNAP_AFTER (增加了 $((SNAP_AFTER - SNAP_BEFORE)))"
if [ $((SEAT_AFTER - SEAT_BEFORE)) -eq 2 ] && [ $((SNAP_AFTER - SNAP_BEFORE)) -eq 1 ]; then
    echo "  ✅ 验证通过：成功写入座位安排和快照"
else
    echo "  ❌ 验证失败：数据写入不正确"
fi
echo ""

# 测试场景7: 验证重复分配 REG1 到同一场次（应该被 duplicateSeat 拦截）
echo "=== 7. 验证重复分配 REG1 到 SCHED1（应该被拦截） ==="
VALIDATE_DUP=$(curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -X POST http://localhost:3001/api/schedules/validate \
  -d "{\"registration_ids\": [\"$REG1\"], \"target_schedule_id\": \"$SCHED1\"}")
echo "$VALIDATE_DUP" | python3 -c "
import sys, json
data = json.load(sys.stdin)
result = data['data']
print(f'验证结果: valid={result[\"valid\"]}')
print('错误信息:')
for e in result['errors']:
    print(f'  - {e}')
if not result['valid'] and any('duplicateSeat' in e or '重复' in e or '已有座位' in e or 'duplicate' in e.lower() for e in result['errors']):
    print('✅ 验证通过：正确拦截了同场次重复分配')
else:
    print('❌ 验证失败：未正确拦截同场次重复分配')
"
echo ""

# 测试场景8: 尝试实际重复分配 REG1（应该失败且不写入数据）
echo "=== 8. 尝试重复分配 REG1 到 SCHED1（应该失败且不写入） ==="
SEAT_BEFORE_DUP=$(sqlite3 data/exam_scheduler.db "SELECT COUNT(*) FROM seat_arrangements WHERE status != 'cancelled';")
SNAP_BEFORE_DUP=$(sqlite3 data/exam_scheduler.db "SELECT COUNT(*) FROM exam_snapshots;")

ASSIGN_DUP=$(curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -X POST http://localhost:3001/api/schedules/$SCHED1/assign \
  -d "{\"registration_ids\": [\"$REG1\"]}")
echo "$ASSIGN_DUP" | python3 -m json.tool
echo ""

SEAT_AFTER_DUP=$(sqlite3 data/exam_scheduler.db "SELECT COUNT(*) FROM seat_arrangements WHERE status != 'cancelled';")
SNAP_AFTER_DUP=$(sqlite3 data/exam_scheduler.db "SELECT COUNT(*) FROM exam_snapshots;")
echo "  分配前 seat_arrangements: $SEAT_BEFORE_DUP, 之后: $SEAT_AFTER_DUP"
echo "  分配前 exam_snapshots: $SNAP_BEFORE_DUP, 之后: $SNAP_AFTER_DUP"
if [ "$SEAT_AFTER_DUP" -eq "$SEAT_BEFORE_DUP" ] && [ "$SNAP_AFTER_DUP" -eq "$SNAP_BEFORE_DUP" ]; then
    echo "  ✅ 验证通过：重复分配未写入任何数据"
else
    echo "  ❌ 验证失败：重复分配写入了数据！"
fi
echo ""

# 测试场景9: 查看排考详情
echo "=== 9. 查看排考详情 ==="
DETAIL=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/schedules/$SCHED1)
echo "$DETAIL" | python3 -c "
import sys, json
data = json.load(sys.stdin)
d = data['data']
print(f'场次ID: {d[\"id\"]}')
print(f'考试时间: {d[\"exam_date\"]} {d[\"start_time\"]}-{d[\"end_time\"]}')
print(f'容量/已分配: {d[\"capacity\"]}/{d[\"assigned_count\"]}')
print(f'座位安排:')
for s in d['seat_arrangements']:
    print(f'  - 座位{s[\"seat_no\"]}: {s[\"candidate_name\"]} (报名ID: {s[\"registration_id\"]}, 状态: {s[\"status\"]})')
if d['assigned_count'] == 2 and len(d['seat_arrangements']) == 2:
    print('✅ 验证通过：排考详情正确显示已分配的座位')
else:
    print('❌ 验证失败：排考详情显示不正确')
"
echo ""

echo "========================================"
echo "回归验证核心场景完成！"
echo "========================================"
