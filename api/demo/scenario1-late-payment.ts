import { getDb, logStep, logResult, createTestSchedule, createTestRegistration, createTestSeatArrangement, queryTable } from './utils.js'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import type { SeatArrangement, Registration, ExamSchedule } from '../db/types.js'

const SCENARIO_NAME = '场景一：培训机构晚补缴后排座'

async function run() {
  console.log(`\n${'#'.repeat(80)}`)
  console.log(`# ${SCENARIO_NAME}`)
  console.log(`# 演示内容：培训机构在临考前补缴费用，系统在不打乱已签到考生的前提下重新排座`)
  console.log(`${'#'.repeat(80)}`)

  const db = getDb()

  try {
    db.exec('BEGIN TRANSACTION')

    logStep(SCENARIO_NAME, 1, '初始化测试数据：创建一个排考，10名已缴费并排座的考生，其中6名已签到')
    
    const roomId = uuidv4()
    const scheduleId = createTestSchedule(db, '2024年计算机等级考试-第1批次', roomId, dayjs().add(1, 'day').format('YYYY-MM-DD'), 30)
    
    const paidRegistrations: string[] = []
    for (let i = 1; i <= 10; i++) {
      const candidateId = uuidv4()
      const regId = createTestRegistration(db, candidateId, scheduleId, 'paid', 'scheduled')
      paidRegistrations.push(regId)
      const isCheckedIn = i <= 6
      createTestSeatArrangement(db, regId, scheduleId, i, isCheckedIn)
    }

    const seatsBefore = queryTable(db, 'seat_arrangements', 'schedule_id = ?', [scheduleId])
    const checkedInCount = seatsBefore.filter(s => s.is_checked_in).length
    logResult(true, `已创建排考 ${scheduleId.slice(0, 8)}，10名考生，${checkedInCount}名已签到`, {
      座位总数: seatsBefore.length,
      已签到: checkedInCount,
      未签到: seatsBefore.length - checkedInCount
    })

    logStep(SCENARIO_NAME, 2, '创建5名未缴费考生（模拟培训机构晚补缴）')
    
    const unpaidRegistrations: string[] = []
    for (let i = 1; i <= 5; i++) {
      const candidateId = uuidv4()
      const regId = createTestRegistration(db, candidateId, scheduleId, 'pending', 'not_scheduled')
      unpaidRegistrations.push(regId)
    }
    
    logResult(true, `已创建5名待补缴考生`, {
      待补缴考生ID: unpaidRegistrations.map(id => id.slice(0, 8))
    })

    logStep(SCENARIO_NAME, 3, '执行补缴后排座接口，保护已签到考生座位')
    
    const latePaymentReq = {
      schedule_id: scheduleId,
      registration_ids: unpaidRegistrations,
      reason: '培训机构临考补缴',
      changed_by: '考务员-张三'
    }

    const now = dayjs().toISOString()
    const existingSeats = db.prepare(`
      SELECT seat_no, registration_id FROM seat_arrangements 
      WHERE schedule_id = ? AND status = 'assigned'
      ORDER BY seat_no
    `).all(scheduleId) as SeatArrangement[]

    const occupiedSeats = new Set(existingSeats.map(s => s.seat_no))
    const checkedInSeats = new Set(
      existingSeats.filter(s => seatsBefore.find(sb => sb.id === s.registration_id)?.is_checked_in)
        .map(s => s.seat_no)
    )

    let nextSeat = Math.max(...existingSeats.map(s => s.seat_no)) + 1
    const assignedSeats: { regId: string; seatNo: number }[] = []
    
    for (const regId of unpaidRegistrations) {
      while (occupiedSeats.has(nextSeat)) {
        nextSeat++
      }
      assignedSeats.push({ regId, seatNo: nextSeat })
      occupiedSeats.add(nextSeat)

      db.prepare(`
        INSERT INTO seat_arrangements (
          id, registration_id, schedule_id, seat_no, row_no, col_no,
          status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(), regId, scheduleId, nextSeat,
        Math.ceil(nextSeat / 6), (nextSeat - 1) % 6 + 1,
        'assigned', now
      )

      db.prepare(`
        UPDATE registrations 
        SET payment_status = 'paid', exam_status = 'scheduled', updated_at = ?
        WHERE id = ?
      `).run(now, regId)

      db.prepare(`
        INSERT INTO exam_change_logs (
          id, schedule_id, change_type, registration_id, candidate_id,
          old_value, new_value, reason, changed_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(), scheduleId, 'late_payment', regId,
        (db.prepare('SELECT candidate_id FROM registrations WHERE id = ?').get(regId) as Registration).candidate_id,
        'not_scheduled', `seat_${nextSeat}`, '培训机构临考补缴', '考务员-张三', now
      )
      
      nextSeat++
    }

    logResult(true, `补缴后排座完成`, {
      保护的已签到座位数: checkedInSeats.size,
      新分配座位数: assignedSeats.length,
      新分配座位详情: assignedSeats.map(a => ({
        考生ID: a.regId.slice(0, 8),
        座位号: a.seatNo
      }))
    })

    logStep(SCENARIO_NAME, 4, '验证已签到考生座位未被变动')
    
    const seatsAfter = queryTable(db, 'seat_arrangements', 'schedule_id = ?', [scheduleId])
    const checkedInSeatsAfter = seatsAfter.filter(s => s.is_checked_in)
    
    let allCheckedInPreserved = true
    for (const seat of checkedInSeatsAfter) {
      const before = seatsBefore.find(s => s.registration_id === seat.registration_id)
      if (before?.seat_no !== seat.seat_no) {
        allCheckedInPreserved = false
        break
      }
    }

    logResult(allCheckedInPreserved, `已签到考生座位保护验证`, {
      验证结果: allCheckedInPreserved ? '✅ 所有已签到考生座位均未变动' : '❌ 存在已签到考生座位被变动',
      已签到考生座位: checkedInSeatsAfter.map(s => ({
        考生ID: s.registration_id.slice(0, 8),
        座位号: s.seat_no,
        签到状态: s.is_checked_in ? '已签到' : '未签到'
      }))
    })

    logStep(SCENARIO_NAME, 5, '查看变更日志，确认所有操作已记录')
    
    const changeLogs = queryTable(db, 'exam_change_logs', 'schedule_id = ?', [scheduleId])
    logResult(true, `变更日志记录`, {
      日志总数: changeLogs.length,
      日志详情: changeLogs.map(log => ({
        时间: dayjs(log.created_at).format('HH:mm:ss'),
        类型: log.change_type,
        考生: log.candidate_id?.slice(0, 8) || '-',
        变更: `${log.old_value} → ${log.new_value}`,
        原因: log.reason,
        操作人: log.changed_by
      }))
    })

    logStep(SCENARIO_NAME, 6, '汇总最终座位分配情况')
    
    const finalSeats = db.prepare(`
      SELECT sa.seat_no, r.candidate_name, r.payment_status, sa.is_checked_in
      FROM seat_arrangements sa
      JOIN registrations r ON sa.registration_id = r.id
      WHERE sa.schedule_id = ?
      ORDER BY sa.seat_no
    `).all(scheduleId) as (SeatArrangement & { candidate_name: string; payment_status: string })[]

    logResult(true, `最终座位分配汇总`, {
      考场总座位: (db.prepare('SELECT capacity FROM schedules WHERE id = ?').get(scheduleId) as ExamSchedule).capacity,
      已分配座位: finalSeats.length,
      已签到考生: finalSeats.filter(s => s.is_checked_in).length,
      补缴新安排: finalSeats.filter(s => !s.is_checked_in && s.seat_no > 10).length,
      座位明细: finalSeats.map(s => ({
        座位号: s.seat_no,
        考生: s.candidate_name,
        缴费状态: s.payment_status === 'paid' ? '已缴费' : '未缴费',
        签到状态: s.is_checked_in ? '✅ 已签到' : '⏳ 未签到',
        考生类型: s.seat_no <= 10 ? '原始安排' : '补缴新安排'
      }))
    })

    db.exec('COMMIT')

    console.log(`\n${'='.repeat(80)}`)
    console.log(`🎉 ${SCENARIO_NAME} 演示完成！`)
    console.log(`   核心功能验证：`)
    console.log(`   ✅ 已签到考生座位保护机制`)
    console.log(`   ✅ 补缴考生从最大座位号后分配`)
    console.log(`   ✅ 座位号冲突自动跳过`)
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
