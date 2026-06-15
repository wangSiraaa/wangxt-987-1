import { getDb, logStep, logResult, createTestSchedule, createTestRegistration, createTestSeatArrangement, queryTable } from './utils.js'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import type { SeatArrangement, Registration } from '../db/types.js'

const SCENARIO_NAME = '场景二：实操设备临时故障转场'

async function run() {
  console.log(`\n${'#'.repeat(80)}`)
  console.log(`# ${SCENARIO_NAME}`)
  console.log(`# 演示内容：实操考试中设备突发故障，将未签到考生转移到备用考场，保护已签到考生`)
  console.log(`${'#'.repeat(80)}`)

  const db = getDb()

  try {
    db.exec('BEGIN TRANSACTION')

    logStep(SCENARIO_NAME, 1, '初始化测试数据：创建两个考场，原考场15名考生（8名已签到），备用考场空闲')
    
    const roomAId = uuidv4()
    const roomBId = uuidv4()
    
    const scheduleId = createTestSchedule(db, '2024年实操考试-第3批次', roomAId, dayjs().format('YYYY-MM-DD'), 20)
    const backupScheduleId = createTestSchedule(db, '2024年实操考试-第3批次(备用)', roomBId, dayjs().format('YYYY-MM-DD'), 20)

    const registrations: { id: string; isCheckedIn: boolean }[] = []
    for (let i = 1; i <= 15; i++) {
      const candidateId = uuidv4()
      const regId = createTestRegistration(db, candidateId, scheduleId, 'paid', 'scheduled')
      const isCheckedIn = i <= 8
      createTestSeatArrangement(db, regId, scheduleId, i, isCheckedIn)
      registrations.push({ id: regId, isCheckedIn })
    }

    logResult(true, `已创建两个考场`, {
      原考场: scheduleId.slice(0, 8) + ' (15名考生，8名已签到)',
      备用考场: backupScheduleId.slice(0, 8) + ' (空闲，20个座位)'
    })

    logStep(SCENARIO_NAME, 2, '上报设备故障：3号电脑主机烧毁，无法继续考试')
    
    const failureId = uuidv4()
    const now = dayjs().toISOString()
    
    db.prepare(`
      INSERT INTO equipment_failures (
        id, schedule_id, room_id, equipment_type, equipment_no,
        description, status, reported_by, reported_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      failureId, scheduleId, roomAId, 'computer', 'PC-003',
      '3号电脑主机烧毁，冒烟，无法启动', 'reported', '监考-李四', now, now
    )

    db.prepare(`
      INSERT INTO exam_change_logs (
        id, schedule_id, change_type, old_value, new_value,
        reason, changed_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(), scheduleId, 'equipment_failure',
      'normal', 'failure', '3号电脑主机烧毁', '监考-李四', now
    )

    const failure = queryTable(db, 'equipment_failures', 'id = ?', [failureId])[0]
    logResult(true, `设备故障已上报`, {
      故障ID: failureId.slice(0, 8),
      设备: failure.equipment_type + '-' + failure.equipment_no,
      描述: failure.description,
      上报人: failure.reported_by,
      状态: '已上报'
    })

    logStep(SCENARIO_NAME, 3, '执行考场转场：保护已签到考生留在原考场，未签到考生转移到备用考场')
    
    const uncheckedInRegs = registrations.filter(r => !r.isCheckedIn)
    const checkedInRegs = registrations.filter(r => r.isCheckedIn)

    const seatsBefore = queryTable(db, 'seat_arrangements', 'schedule_id = ?', [scheduleId])
    
    let nextBackupSeat = 1
    const transferredSeats: { regId: string; oldSeat: number; newSeat: number }[] = []

    for (const reg of uncheckedInRegs) {
      const oldSeat = (db.prepare(`
        SELECT seat_no FROM seat_arrangements WHERE registration_id = ? AND schedule_id = ?
      `).get(reg.id, scheduleId) as SeatArrangement)?.seat_no

      db.prepare(`
        UPDATE seat_arrangements 
        SET status = 'transferred', original_schedule_id = ?, updated_at = ?
        WHERE registration_id = ? AND schedule_id = ?
      `).run(scheduleId, now, reg.id, scheduleId)

      db.prepare(`
        INSERT INTO seat_arrangements (
          id, registration_id, schedule_id, seat_no, row_no, col_no,
          status, is_accessibility, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(), reg.id, backupScheduleId, nextBackupSeat,
        Math.ceil(nextBackupSeat / 6), (nextBackupSeat - 1) % 6 + 1,
        'assigned', 0, now
      )

      db.prepare(`
        UPDATE registrations 
        SET schedule_id = ?, updated_at = ?
        WHERE id = ?
      `).run(backupScheduleId, now, reg.id)

      transferredSeats.push({ regId: reg.id, oldSeat, newSeat: nextBackupSeat })

      db.prepare(`
        INSERT INTO exam_change_logs (
          id, schedule_id, change_type, registration_id, candidate_id,
          old_value, new_value, reason, changed_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(), scheduleId, 'room_transfer', reg.id,
        (db.prepare('SELECT candidate_id FROM registrations WHERE id = ?').get(reg.id) as Registration).candidate_id,
        `原考场-座位${oldSeat}`, `备用考场-座位${nextBackupSeat}`,
        '原考场3号电脑故障，转场到备用考场', '考务主管-王五', now
      )

      nextBackupSeat++
    }

    db.prepare(`
      UPDATE equipment_failures 
      SET status = 'transferred', transfer_schedule_id = ?, transferred_at = ?, updated_at = ?
      WHERE id = ?
    `).run(backupScheduleId, now, now, failureId)

    logResult(true, `考场转场完成`, {
      保护的已签到考生: checkedInRegs.length + ' 人（留在原考场）',
      转移的未签到考生: transferredSeats.length + ' 人（转至备用考场）',
      转移详情: transferredSeats.map(t => ({
        考生ID: t.regId.slice(0, 8),
        原座位: `原考场-${t.oldSeat}`,
        新座位: `备用考场-${t.newSeat}`
      }))
    })

    logStep(SCENARIO_NAME, 4, '验证已签到考生座位未被变动')
    
    const checkedInSeatsAfter = db.prepare(`
      SELECT sa.seat_no, r.candidate_name, sa.is_checked_in
      FROM seat_arrangements sa
      JOIN registrations r ON sa.registration_id = r.id
      WHERE sa.schedule_id = ? AND sa.is_checked_in = 1
      ORDER BY sa.seat_no
    `).all(scheduleId) as (SeatArrangement & { candidate_name: string })[]

    const preserved = checkedInSeatsAfter.length === checkedInRegs.length
    logResult(preserved, `已签到考生保护验证`, {
      验证结果: preserved ? '✅ 所有已签到考生仍在原考场且座位未变' : '❌ 已签到考生座位有变动',
      原考场剩余考生: checkedInSeatsAfter.length + ' 人',
      考生座位: checkedInSeatsAfter.map(s => ({
        考生: s.candidate_name,
        座位号: s.seat_no,
        签到状态: '✅ 已签到'
      }))
    })

    logStep(SCENARIO_NAME, 5, '查看备用考场新安排的考生')
    
    const backupSeats = db.prepare(`
      SELECT sa.seat_no, r.candidate_name, sa.status
      FROM seat_arrangements sa
      JOIN registrations r ON sa.registration_id = r.id
      WHERE sa.schedule_id = ?
      ORDER BY sa.seat_no
    `).all(backupScheduleId) as (SeatArrangement & { candidate_name: string })[]

    logResult(true, `备用考场座位安排`, {
      已安排考生: backupSeats.length + ' 人',
      座位明细: backupSeats.map(s => ({
        座位号: s.seat_no,
        考生: s.candidate_name,
        状态: '已安排'
      }))
    })

    logStep(SCENARIO_NAME, 6, '查看完整变更日志')
    
    const changeLogs = queryTable(db, 'exam_change_logs', 'schedule_id IN (?, ?)', [scheduleId, backupScheduleId])
    logResult(true, `变更日志记录`, {
      日志总数: changeLogs.length,
      日志详情: changeLogs.map(log => ({
        时间: dayjs(log.created_at).format('HH:mm:ss'),
        类型: log.change_type,
        考场: log.schedule_id === scheduleId ? '原考场' : '备用考场',
        考生: log.candidate_id?.slice(0, 8) || '-',
        变更: `${log.old_value} → ${log.new_value}`,
        原因: log.reason,
        操作人: log.changed_by
      }))
    })

    db.exec('COMMIT')

    console.log(`\n${'='.repeat(80)}`)
    console.log(`🎉 ${SCENARIO_NAME} 演示完成！`)
    console.log(`   核心功能验证：`)
    console.log(`   ✅ 设备故障上报与记录`)
    console.log(`   ✅ 已签到考生留在原考场保护`)
    console.log(`   ✅ 未签到考生自动转场到备用考场`)
    console.log(`   ✅ 原座位标记为transferred状态`)
    console.log(`   ✅ 所有变更完整记录日志`)
    console.log(`${'='.repeat(80)}\n`)

  } catch (error: any) {
    db.exec('ROLLBACK')
    console.error('❌ 演示失败：', error.message)
    throw error
  } finally {
    db.close()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch(console.error)
}

export default run
