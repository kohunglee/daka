-- 仅用于本地 UI 测试：为指定测试账号补 10 条历史记录。
-- 对应图片需先由本地 R2 上传脚本写入同名 checkins/{user_id}/{date}.jpg 对象。
INSERT OR IGNORE INTO daily_checkin (id, user_id, checkin_date, hours, backlinks, quality, log, image_key, image_bytes, created_at)
SELECT 'demo-checkin-20260903', id, '2026-09-03', 'D', 'B', 8,
  '今天完成了海外市场资料整理，记录一个可继续验证的方向。',
  'checkins/' || id || '/2026-09-03.jpg', 65365, strftime('%s', '2026-09-03 10:00:00') * 1000
FROM user WHERE lower(email) = lower('2528852314@qq.com');

INSERT OR IGNORE INTO daily_checkin (id, user_id, checkin_date, hours, backlinks, quality, log, image_key, image_bytes, created_at)
SELECT 'demo-checkin-20260902', id, '2026-09-02', 'C', 'B', 7,
  '今天完成了竞品页面观察，整理出几条值得继续跟进的用户需求。',
  'checkins/' || id || '/2026-09-02.jpg', 65365, strftime('%s', '2026-09-02 10:00:00') * 1000
FROM user WHERE lower(email) = lower('2528852314@qq.com');

INSERT OR IGNORE INTO daily_checkin (id, user_id, checkin_date, hours, backlinks, quality, log, image_key, image_bytes, created_at)
SELECT 'demo-checkin-20260901', id, '2026-09-01', 'D', 'C', 9,
  '今天完成了产品介绍文案修改，并补充了几个海外渠道的发布计划。',
  'checkins/' || id || '/2026-09-01.jpg', 65365, strftime('%s', '2026-09-01 10:00:00') * 1000
FROM user WHERE lower(email) = lower('2528852314@qq.com');

INSERT OR IGNORE INTO daily_checkin (id, user_id, checkin_date, hours, backlinks, quality, log, image_key, image_bytes, created_at)
SELECT 'demo-checkin-20260831', id, '2026-08-31', 'D', 'B', 8,
  '今天完成了搜索表现检查，记录了页面收录和外链变化情况。',
  'checkins/' || id || '/2026-08-31.jpg', 65365, strftime('%s', '2026-08-31 10:00:00') * 1000
FROM user WHERE lower(email) = lower('2528852314@qq.com');

INSERT OR IGNORE INTO daily_checkin (id, user_id, checkin_date, hours, backlinks, quality, log, image_key, image_bytes, created_at)
SELECT 'demo-checkin-20260830', id, '2026-08-30', 'C', 'B', 7,
  '今天完成了站点结构梳理，准备继续优化导航和内容之间的连接。',
  'checkins/' || id || '/2026-08-30.jpg', 65365, strftime('%s', '2026-08-30 10:00:00') * 1000
FROM user WHERE lower(email) = lower('2528852314@qq.com');

INSERT OR IGNORE INTO daily_checkin (id, user_id, checkin_date, hours, backlinks, quality, log, image_key, image_bytes, created_at)
SELECT 'demo-checkin-20260829', id, '2026-08-29', 'D', 'C', 9,
  '今天完成了目标用户资料收集，下一步准备把问题拆成可执行的小任务。',
  'checkins/' || id || '/2026-08-29.jpg', 65365, strftime('%s', '2026-08-29 10:00:00') * 1000
FROM user WHERE lower(email) = lower('2528852314@qq.com');

INSERT OR IGNORE INTO daily_checkin (id, user_id, checkin_date, hours, backlinks, quality, log, image_key, image_bytes, created_at)
SELECT 'demo-checkin-20260828', id, '2026-08-28', 'C', 'B', 8,
  '今天完成了海外社区内容浏览，摘录了几条可以转化为产品思路的反馈。',
  'checkins/' || id || '/2026-08-28.jpg', 65365, strftime('%s', '2026-08-28 10:00:00') * 1000
FROM user WHERE lower(email) = lower('2528852314@qq.com');

INSERT OR IGNORE INTO daily_checkin (id, user_id, checkin_date, hours, backlinks, quality, log, image_key, image_bytes, created_at)
SELECT 'demo-checkin-20260827', id, '2026-08-27', 'D', 'B', 8,
  '今天完成了落地页速度检查，标记了几处后续可以细化的体验问题。',
  'checkins/' || id || '/2026-08-27.jpg', 65365, strftime('%s', '2026-08-27 10:00:00') * 1000
FROM user WHERE lower(email) = lower('2528852314@qq.com');

INSERT OR IGNORE INTO daily_checkin (id, user_id, checkin_date, hours, backlinks, quality, log, image_key, image_bytes, created_at)
SELECT 'demo-checkin-20260826', id, '2026-08-26', 'C', 'B', 7,
  '今天完成了关键词意图整理，留下了几组适合持续观察的搜索词。',
  'checkins/' || id || '/2026-08-26.jpg', 65365, strftime('%s', '2026-08-26 10:00:00') * 1000
FROM user WHERE lower(email) = lower('2528852314@qq.com');

INSERT OR IGNORE INTO daily_checkin (id, user_id, checkin_date, hours, backlinks, quality, log, image_key, image_bytes, created_at)
SELECT 'demo-checkin-20260825', id, '2026-08-25', 'D', 'C', 9,
  '今天完成了本周工作复盘，确认接下来优先推进内容发布和数据验证。',
  'checkins/' || id || '/2026-08-25.jpg', 65365, strftime('%s', '2026-08-25 10:00:00') * 1000
FROM user WHERE lower(email) = lower('2528852314@qq.com');
