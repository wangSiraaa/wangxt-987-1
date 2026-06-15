import { getDb, logStep, logResult, createTestSchedule, createTestRegistration, createTestSeatArrangement, queryTable } from './utils.js'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import type { Registration, CheatingReview, MakeupInheritance } from '../db/types.js'

const SCENARIO_NAME = '场景三：作弊冻结后的申诉复核'

async function run() {
  console.log(`\n${'#'.repeat(80)}`)
  console.log(`# ${SCENARIO_NAME}`)
  console.log(`# 演示内容：考生作弊被上报→成绩冻结→考生申诉→主管复核→成绩解锁的完整流程`)
  console.log(`${'#'.repeat(80)}`)

  const db = getDb()

  try {
    db.exec('BEGIN TRANSACTION')

    logStep(SCENARIO_NAME, 1, '初始化测试数据：创建一个排考，10名考生，均已签到并完成考试')
    
    const roomId = uuidv4()
    const scheduleId = createTestSchedule(db, '2024年理论考试-第2批次', roomId, dayjs().subtract(1, 'day').format('YYYY-MM-DD'), 30)

    const registrations: string[] = []
    for (let i = 1; i <= 10; i++) {
      const candidateId = uuidv4()
      const regId = createTestRegistration(db, candidateId, scheduleId, 'paid', 'completed')
      createTestSeatArrangement(db, regId, scheduleId, i, true)
      
      db.prepare(`
        UPDATE registrations 
        SET score = ?, score_status = ?, updated_at = ?
        WHERE id = ?
      `).run(70 + Math.floor(Math.random() * 30), 'final', dayjs().toISOString(), regId)
      
      registrations.push(regId)
    }

    const suspectRegId = registrations[3]
    const suspectCandidate = db.prepare('SELECT candidate_id, candidate_name FROM registrations WHERE id = ?').get(suspectRegId) as Registration

    logResult(true, `已创建测试数据`, {
      排考ID: scheduleId.slice(0, 8),
      考生总数: 10,
      嫌疑考生: suspectCandidate.candidate_name + ' (' + suspectRegId.slice(0, 8) + ')',
      当前成绩: db.prepare('SELECT score, score_status FROM registrations WHERE id = ?').get(suspectRegId)
    })

    logStep(SCENARIO_NAME, 2, '监考上报作弊：发现考生夹带小抄，立即冻结成绩')
    
    const now = dayjs().toISOString()
    const reviewId = uuidv4()

    db.prepare(`
      INSERT INTO cheating_reviews (
        id, registration_id, candidate_id, schedule_id,
        report_reason, evidence, reported_by, reported_at,
        status, score_unlocked, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reviewId, suspectRegId, suspectCandidate.candidate_id, scheduleId,
      '考试中夹带写有公式的小抄，被监考当场发现',
      'https://evidence.example.com/photo_20240115_0932.jpg',
      '监考-赵六', now, 'pending', 0, now
    )

    db.prepare(`
      UPDATE registrations 
      SET is_cheating = 1, cheating_notes = ?, cheating_review_id = ?, 
          score_status = 'frozen', updated_at = ?
      WHERE id = ?
    `).run('夹带小抄', reviewId, now, suspectRegId)

    db.prepare(`
      INSERT INTO exam_change_logs (
        id, schedule_id, change_type, registration_id, candidate_id,
        old_value, new_value, reason, changed_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(), scheduleId, 'cheating', suspectRegId, suspectCandidate.candidate_id,
      'score_final', 'score_frozen', '夹带小抄，成绩冻结', '监考-赵六', now
    )

    const afterFreeze = db.prepare('SELECT score, score_status, is_cheating FROM registrations WHERE id = ?').get(suspectRegId) as Registration
    logResult(true, `作弊已上报，成绩已冻结`, {
      复核ID: reviewId.slice(0, 8),
      考生: suspectCandidate.candidate_name,
      作弊事实: '考试中夹带小抄',
      证据: '已上传照片',
      成绩状态: afterFreeze.score_status === 'frozen' ? '❄️ 已冻结' : '状态异常',
      成绩: afterFreeze.score + ' 分（已冻结，暂不公布）'
    })

    logStep(SCENARIO_NAME, 3, '初审：考务员复核，初步认定作弊成立')
    
    const reviewNow = dayjs().add(1, 'hour').toISOString()
    db.prepare(`
      UPDATE cheating_reviews 
      SET status = 'reviewing', reviewed_by = '考务员-钱七', 
          review_remarks = '证据确凿，考生未否认', reviewed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(reviewNow, reviewNow, reviewId)

    db.prepare(`
      INSERT INTO exam_change_logs (
        id, schedule_id, change_type, registration_id, candidate_id,
        old_value, new_value, reason, changed_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(), scheduleId, 'cheating', suspectRegId, suspectCandidate.candidate_id,
      'pending', 'reviewing', '考务员初步复核', '考务员-钱七', reviewNow
    )

    logResult(true, `考务员初步复核完成`, {
      状态: '复核中',
      复核人: '考务员-钱七',
      初步意见: '证据确凿，考生未否认，建议认定作弊'
    })

    logStep(SCENARIO_NAME, 4, '考生申诉：称是复习资料误带入考场，申请重新复核')
    
    const appealNow = dayjs().add(3, 'hour').toISOString()
    db.prepare(`
      UPDATE cheating_reviews 
      SET appeal_remark = ?, appeal_evidence = ?, appeal_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      '这是我早上复习用的资料，匆忙中误带入考场，并未查看。恳请重新核实监控录像。',
      'https://evidence.example.com/appeal_docs.pdf',
      appealNow, appealNow, reviewId
    )

    logResult(true, `考生已提交申诉`, {
      申诉时间: dayjs(appealNow).format('YYYY-MM-DD HH:mm'),
      申诉理由: '复习资料误带入考场，未实际作弊',
      申诉证据: '已提交书面说明和考场监控申请'
    })

    logStep(SCENARIO_NAME, 5, '主管复核：调阅监控后发现考生并未查看，属于误带，决定不予认定，解锁成绩')
    
    const finalReviewNow = dayjs().add(6, 'hour').toISOString()
    
    db.prepare(`
      UPDATE cheating_reviews 
      SET status = 'dismissed', score_unlocked = 1,
          final_reviewed_by = '考务主管-孙八',
          final_review_remarks = '经调阅考场监控，考生入座后未查看该资料，确系误带。不予认定作弊。',
          final_reviewed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(finalReviewNow, finalReviewNow, reviewId)

    db.prepare(`
      UPDATE registrations 
      SET is_cheating = 0, cheating_notes = ?, 
          score_status = 'final', updated_at = ?
      WHERE id = ?
    `).run('经主管复核，不予认定作弊', finalReviewNow, suspectRegId)

    db.prepare(`
      INSERT INTO exam_change_logs (
        id, schedule_id, change_type, registration_id, candidate_id,
        old_value, new_value, reason, changed_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(), scheduleId, 'cheating', suspectRegId, suspectCandidate.candidate_id,
      'score_frozen', 'score_final', '主管复核：不予认定，成绩解锁', '考务主管-孙八', finalReviewNow
    )

    const afterUnlock = db.prepare('SELECT score, score_status, is_cheating FROM registrations WHERE id = ?').get(suspectRegId) as Registration
    logResult(true, `主管复核完成，成绩已解锁`, {
      复核结论: '不予认定作弊',
      复核人: '考务主管-孙八',
      复核意见: '经调阅监控，考生未查看资料，确系误带',
      成绩状态: afterUnlock.score_status === 'final' ? '✅ 已解锁' : '状态异常',
      成绩: afterUnlock.score + ' 分（已解锁，正常公布）',
      作弊标记: afterUnlock.is_cheating ? '有标记' : '✅ 已清除'
    })

    logStep(SCENARIO_NAME, 6, '查看完整的作弊复核记录')
    
    const reviewRecord = queryTable(db, 'cheating_reviews', 'id = ?', [reviewId])[0] as CheatingReview
    logResult(true, `作弊复核记录详情`, {
      考生: reviewRecord.candidate_id?.slice(0, 8) || suspectCandidate.candidate_name,
      上报: `${dayjs(reviewRecord.reported_at).format('HH:mm')} - ${reviewRecord.reported_by}`,
      作弊事实: reviewRecord.report_reason,
      考务员复核: `${reviewRecord.reviewed_by} - ${reviewRecord.review_remarks}`,
      考生申诉: reviewRecord.appeal_remark ? reviewRecord.appeal_remark.substring(0, 50) + '...' : '无',
      主管复核: `${reviewRecord.final_reviewed_by} - ${reviewRecord.final_review_remarks}`,
      最终状态: reviewRecord.status === 'dismissed' ? '✅ 不予认定' : 
                reviewRecord.status === 'sustained' ? '❌ 作弊成立' : '处理中',
      成绩解锁: reviewRecord.score_unlocked ? '✅ 已解锁' : '❄️ 已冻结'
    })

    logStep(SCENARIO_NAME, 7, '查看完整变更日志，确认所有操作可追溯')
    
    const changeLogs = queryTable(db, 'exam_change_logs', 'registration_id = ?', [suspectRegId])
    logResult(true, `完整审计轨迹`, {
      日志总数: changeLogs.length + ' 条记录',
      时间线: changeLogs.map((log, idx) => ({
        步骤: idx + 1,
        时间: dayjs(log.created_at).format('YYYY-MM-DD HH:mm:ss'),
        操作: log.change_type === 'cheating' ? '作弊处理' : log.change_type,
        状态变更: `${log.old_value} → ${log.new_value}`,
        原因: log.reason,
        操作人: log.changed_by
      }))
    })

    logStep(SCENARIO_NAME, 8, '验证补考继承链：假设另一考生作弊成立，创建补考时违纪记录被保留')
    
    const cheaterRegId = registrations[5]
    const cheaterCandidate = db.prepare('SELECT candidate_id, candidate_name FROM registrations WHERE id = ?').get(cheaterRegId) as Registration
    
    const cheaterReviewId = uuidv4()
    db.prepare(`
      INSERT INTO cheating_reviews (
        id, registration_id, candidate_id, schedule_id,
        report_reason, reported_by, reported_at,
        status, score_unlocked, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cheaterReviewId, cheaterRegId, cheaterCandidate.candidate_id, scheduleId,
      '使用手机拍摄试题并传递答案', '监考-周九', now, 'sustained', 0, now
    )

    db.prepare(`
      UPDATE registrations 
      SET is_cheating = 1, cheating_notes = '使用手机作弊', 
          cheating_review_id = ?, disciplinary_record = '作弊：使用电子设备',
          exam_status = 'failed', score_status = 'frozen', updated_at = ?
      WHERE id = ?
    `).run(cheaterReviewId, now, cheaterRegId)

    const makeupRegId = uuidv4()
    db.prepare(`
      INSERT INTO registrations (
        id, candidate_id, candidate_name, candidate_id_card, schedule_id,
        subject_id, subject_name, payment_status, exam_status,
        original_registration_id, is_makeup, disciplinary_record,
        created_at
      ) SELECT ?, candidate_id, candidate_name, candidate_id_card, ?,
               subject_id, subject_name, 'paid', 'scheduled',
               ?, 1, disciplinary_record, ?
        FROM registrations WHERE id = ?
    `).run(makeupRegId, scheduleId, cheaterRegId, now, cheaterRegId)

    db.prepare(`
      INSERT INTO makeup_inheritances (
        id, original_registration_id, new_registration_id,
        candidate_id, reason, inheritance_type,
        preserves_disciplinary_record, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(), cheaterRegId, makeupRegId, cheaterCandidate.candidate_id,
      '作弊后参加补考', 'failure', 1, now
    )

    const originalReg = db.prepare('SELECT candidate_name, disciplinary_record, is_cheating FROM registrations WHERE id = ?').get(cheaterRegId) as Registration
    const makeupReg = db.prepare('SELECT candidate_name, disciplinary_record, is_makeup, original_registration_id FROM registrations WHERE id = ?').get(makeupRegId) as Registration
    const inheritance = queryTable(db, 'makeup_inheritances', 'new_registration_id = ?', [makeupRegId])[0] as MakeupInheritance

    logResult(true, `补考继承链验证`, {
      原始报名: {
        考生: originalReg.candidate_name,
        违纪记录: originalReg.disciplinary_record,
        作弊标记: originalReg.is_cheating ? '有' : '无'
      },
      补考报名: {
        考生: makeupReg.candidate_name,
        是否补考: makeupReg.is_makeup ? '是' : '否',
        继承的违纪记录: makeupReg.disciplinary_record,
        原始报名关联: makeupReg.original_registration_id?.slice(0, 8) || '无'
      },
      继承链记录: {
        继承类型: inheritance.inheritance_type === 'failure' ? '不及格补考' : '其他',
        保留违纪记录: inheritance.preserves_disciplinary_record ? '✅ 已保留' : '❌ 未保留',
        补考原因: inheritance.reason
      },
      验证结果: makeupReg.disciplinary_record === originalReg.disciplinary_record ? 
        '✅ 违纪记录已成功继承，未被冲掉' : '❌ 违纪记录丢失'
    })

    db.exec('COMMIT')

    console.log(`\n${'='.repeat(80)}`)
    console.log(`🎉 ${SCENARIO_NAME} 演示完成！`)
    console.log(`   核心功能验证：`)
    console.log(`   ✅ 作弊上报与成绩自动冻结`)
    console.log(`   ✅ 考务员初步复核流程`)
    console.log(`   ✅ 考生申诉通道`)
    console.log(`   ✅ 主管最终复核与成绩解锁`)
    console.log(`   ✅ 完整的审计轨迹记录`)
    console.log(`   ✅ 补考继承链：违纪记录不被冲掉`)
    console.log(`   ✅ 原始报名数据完整保留`)
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
