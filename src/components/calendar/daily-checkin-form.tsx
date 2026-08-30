/**
 * 每日出海打卡表单。
 *
 * 截图会在浏览器内完成编辑和 JPEG 压缩，再通过同一个 FormData 提交到 D1/R2。
 * 失败时不清空表单，方便陛下直接重试。
 */
import {
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitCheckinFn } from '@/features/checkin/actions'
import {
  BACKLINK_OPTION_LABELS,
  countChineseCharacters,
  HOURS_OPTION_LABELS,
  MAX_CHECKIN_IMAGE_BYTES,
  MAX_CHECKIN_IMAGE_DIMENSION,
  type CheckinOption,
  type CheckinRecordView,
} from '@/features/checkin/checkin.shared'

/** 画笔工具类型：马赛克用于遮挡敏感信息，红笔用于自由标记。 */
type BrushTool = 'mosaic' | 'red'

/** 两种工具使用固定粗细：马赛克用粗笔，红色涂抹用细笔。 */
const BRUSH_SIZES: Record<BrushTool, number> = {
  mosaic: 30,
  red: 14,
}

/** 表单只展示中文选项，提交值使用后端约定的 A/B/C/D 枚举。 */
const HOURS_OPTIONS: ReadonlyArray<{ value: CheckinOption; label: string }> = [
  { value: 'A', label: HOURS_OPTION_LABELS.A },
  { value: 'B', label: HOURS_OPTION_LABELS.B },
  { value: 'C', label: HOURS_OPTION_LABELS.C },
  { value: 'D', label: HOURS_OPTION_LABELS.D },
]
const BACKLINK_OPTIONS: ReadonlyArray<{ value: CheckinOption; label: string }> = [
  { value: 'A', label: BACKLINK_OPTION_LABELS.A },
  { value: 'B', label: BACKLINK_OPTION_LABELS.B },
  { value: 'C', label: BACKLINK_OPTION_LABELS.C },
  { value: 'D', label: BACKLINK_OPTION_LABELS.D },
]

/** 字段标题后的轻量说明提示：鼠标悬浮或键盘聚焦问号时显示，不干扰表单填写。 */
function FieldHint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex" tabIndex={0} aria-label={`说明：${text}`}>
      <span
        aria-hidden="true"
        className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-fg-3/25 text-[11px] font-semibold leading-none text-fg-3 transition-colors group-hover:border-fg-3/35 group-focus-within:border-fg-3/35"
      >
        ?
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 w-max max-w-[280px] rounded-md border border-border bg-bg-alt px-3 py-2 text-xs font-normal leading-5 text-fg-2 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}

/** 编辑画布最长边，和本轮确定的前端压缩策略保持一致。 */
const MAX_EDITOR_WIDTH = MAX_CHECKIN_IMAGE_DIMENSION

/** 将指针事件换算成画布内部坐标，兼容 CSS 缩放后的展示尺寸。 */
function getCanvasPoint(event: ReactPointerEvent<HTMLCanvasElement>) {
  const canvas = event.currentTarget
  const rect = canvas.getBoundingClientRect()
  // 画布可能被 object-contain 或父容器缩放，先计算实际图片内容在外框中的偏移。
  const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height)
  const renderedWidth = canvas.width * scale
  const renderedHeight = canvas.height * scale
  const offsetX = (rect.width - renderedWidth) / 2
  const offsetY = (rect.height - renderedHeight) / 2

  return {
    x: Math.max(0, Math.min(canvas.width, (event.clientX - rect.left - offsetX) / scale)),
    y: Math.max(0, Math.min(canvas.height, (event.clientY - rect.top - offsetY) / scale)),
  }
}

/** 在原图采样颜色并绘制像素块，形成可拖动的马赛克遮挡效果。 */
function drawMosaicStamp(
  targetContext: CanvasRenderingContext2D,
  sourceContext: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  const half = size / 2
  const left = Math.max(0, Math.floor(x - half))
  const top = Math.max(0, Math.floor(y - half))
  const right = Math.min(targetContext.canvas.width, Math.ceil(x + half))
  const bottom = Math.min(targetContext.canvas.height, Math.ceil(y + half))
  const width = right - left
  const height = bottom - top
  if (width <= 0 || height <= 0) return

  const sourcePixels = sourceContext.getImageData(left, top, width, height).data
  const blockSize = Math.max(6, Math.round(size / 7))

  for (let blockY = 0; blockY < height; blockY += blockSize) {
    for (let blockX = 0; blockX < width; blockX += blockSize) {
      const sampleX = Math.min(width - 1, blockX + Math.floor(blockSize / 2))
      const sampleY = Math.min(height - 1, blockY + Math.floor(blockSize / 2))
      const pixelIndex = (sampleY * width + sampleX) * 4
      const red = sourcePixels[pixelIndex] ?? 0
      const green = sourcePixels[pixelIndex + 1] ?? 0
      const blue = sourcePixels[pixelIndex + 2] ?? 0
      const alpha = (sourcePixels[pixelIndex + 3] ?? 255) / 255
      targetContext.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`
      targetContext.fillRect(
        left + blockX,
        top + blockY,
        Math.min(blockSize, width - blockX),
        Math.min(blockSize, height - blockY),
      )
    }
  }
}

/** 在两个连续指针点之间补齐笔触，避免快速拖动时出现断线。 */
function drawBrushSegment(
  targetContext: CanvasRenderingContext2D,
  sourceContext: CanvasRenderingContext2D,
  tool: BrushTool,
  size: number,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y)
  const steps = Math.max(1, Math.ceil(distance / Math.max(2, size / 3)))

  if (tool === 'mosaic') {
    for (let index = 0; index <= steps; index += 1) {
      const progress = index / steps
      drawMosaicStamp(
        targetContext,
        sourceContext,
        from.x + (to.x - from.x) * progress,
        from.y + (to.y - from.y) * progress,
        size,
      )
    }
    return
  }

  targetContext.save()
  targetContext.strokeStyle = '#e5484d'
  targetContext.lineWidth = size
  targetContext.lineCap = 'round'
  targetContext.lineJoin = 'round'
  targetContext.beginPath()
  targetContext.moveTo(from.x, from.y)
  targetContext.lineTo(to.x, to.y)
  targetContext.stroke()
  targetContext.restore()
}

/** 将编辑画布按比例输出为 JPEG，并逐步降低质量/尺寸直到不超过 300KB。 */
async function compressEditedCanvas(canvas: HTMLCanvasElement): Promise<Blob | null> {
  const qualityLevels = [0.92, 0.84, 0.76, 0.68, 0.6, 0.5, 0.4, 0.3]
  const scaleLevels = [1, 0.9, 0.8, 0.7, 0.6, 0.5]

  for (const scale of scaleLevels) {
    const output = document.createElement('canvas')
    output.width = Math.max(1, Math.round(canvas.width * scale))
    output.height = Math.max(1, Math.round(canvas.height * scale))
    const context = output.getContext('2d')
    if (!context) return null
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, output.width, output.height)
    context.drawImage(canvas, 0, 0, output.width, output.height)

    for (const quality of qualityLevels) {
      const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, 'image/jpeg', quality))
      if (blob && blob.size <= MAX_CHECKIN_IMAGE_BYTES) return blob
    }
  }

  return null
}

/** 每日打卡字段的前端表单容器，负责即时展示填写进度和原生校验约束。 */
export function DailyCheckinForm({ onSuccess }: { onSuccess?: (record: CheckinRecordView, currentStreak: number) => void }) {
  const [gscFile, setGscFile] = useState<File | null>(null)
  const [brushTool, setBrushTool] = useState<BrushTool>('mosaic')
  const [imageReady, setImageReady] = useState(false)
  const [editorError, setEditorError] = useState<string | null>(null)
  const [hours, setHours] = useState<CheckinOption | ''>('')
  const [backlinks, setBacklinks] = useState<CheckinOption | ''>('')
  const [quality, setQuality] = useState(5)
  const [log, setLog] = useState('')
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  /** 统一处理选择或粘贴进来的图片，并把图片文件同步到原生 file input。 */
  function handleImageFile(file: File) {
    setGscFile(file)
    setImageReady(false)
    setEditorError(null)
    setSubmitMessage(null)

    // 粘贴得到的 File 不会自动进入 file input；同步后才能通过同一张表单的 required 校验。
    const fileInput = fileInputRef.current
    if (fileInput && fileInput.files?.[0] !== file) {
      const transfer = new DataTransfer()
      transfer.items.add(file)
      fileInput.files = transfer.files
    }

    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, MAX_EDITOR_WIDTH / image.naturalWidth)
      const width = Math.max(1, Math.round(image.naturalWidth * scale))
      const height = Math.max(1, Math.round(image.naturalHeight * scale))
      const canvas = canvasRef.current
      if (!canvas) {
        URL.revokeObjectURL(objectUrl)
        return
      }

      const sourceCanvas = document.createElement('canvas')
      sourceCanvas.width = width
      sourceCanvas.height = height
      canvas.width = width
      canvas.height = height
      const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true })
      const targetContext = canvas.getContext('2d')
      if (!sourceContext || !targetContext) {
        setEditorError('当前浏览器无法创建图片编辑画布。')
        URL.revokeObjectURL(objectUrl)
        return
      }

      sourceContext.drawImage(image, 0, 0, width, height)
      targetContext.drawImage(sourceCanvas, 0, 0)
      sourceCanvasRef.current = sourceCanvas
      setImageReady(true)
      URL.revokeObjectURL(objectUrl)
    }
    image.onerror = () => {
      setGscFile(null)
      setEditorError('图片读取失败，请重新选择 PNG、JPG 或 WebP 图片。')
      URL.revokeObjectURL(objectUrl)
    }
    image.src = objectUrl
  }

  /** 从系统文件选择器读取图片。 */
  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) handleImageFile(file)
  }

  /** 支持在表单或下方粘贴框内直接使用 Cmd+V / Ctrl+V 粘贴截图。 */
  function handlePaste(event: ReactClipboardEvent<HTMLElement>) {
    const item = Array.from(event.clipboardData.items).find(
      (entry) => entry.kind === 'file' && entry.type.startsWith('image/'),
    )
    const file = item?.getAsFile()
    if (!file) return
    event.preventDefault()
    handleImageFile(file)
  }

  /** 阻止粘贴事件继续冒泡，避免同一张截图被表单和文本框重复处理。 */
  function handlePasteBox(event: ReactClipboardEvent<HTMLTextAreaElement>) {
    event.stopPropagation()
    handlePaste(event)
  }

  /** 在画布上开始绘制，并锁定指针，保证拖到画布边缘时笔触不中断。 */
  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!imageReady) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drawingRef.current = true
    const point = getCanvasPoint(event)
    lastPointRef.current = point
    const targetContext = event.currentTarget.getContext('2d')
    const sourceContext = sourceCanvasRef.current?.getContext('2d', { willReadFrequently: true })
    if (targetContext && sourceContext) {
      drawBrushSegment(targetContext, sourceContext, brushTool, BRUSH_SIZES[brushTool], point, point)
    }
  }

  /** 绘制连续笔触：马赛克按原图采样，红笔使用固定红色自由涂抹。 */
  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !lastPointRef.current) return
    const targetContext = event.currentTarget.getContext('2d')
    const sourceContext = sourceCanvasRef.current?.getContext('2d', { willReadFrequently: true })
    if (!targetContext || !sourceContext) return

    const point = getCanvasPoint(event)
    drawBrushSegment(targetContext, sourceContext, brushTool, BRUSH_SIZES[brushTool], lastPointRef.current, point)
    lastPointRef.current = point
  }

  /** 结束当前笔触，释放指针捕获状态。 */
  function handlePointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false
    lastPointRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  /** 清除所有涂抹并恢复到刚选择的原图，方便重新编辑。 */
  function resetEditor() {
    const canvas = canvasRef.current
    const sourceCanvas = sourceCanvasRef.current
    const targetContext = canvas?.getContext('2d')
    if (!canvas || !targetContext || !sourceCanvas) return
    targetContext.clearRect(0, 0, canvas.width, canvas.height)
    targetContext.drawImage(sourceCanvas, 0, 0)
    setSubmitMessage(null)
  }

  /** 压缩编辑结果并和四个字段一起交给服务端，失败时保留所有表单状态。 */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    const canvas = canvasRef.current
    if (!canvas || !gscFile) {
      setSubmitMessage('请先选择并编辑 GSC 截图。')
      return
    }
    if (countChineseCharacters(log) < 20) {
      setSubmitMessage('工作日志至少需要 20 个汉字')
      return
    }

    setIsSubmitting(true)
    setSubmitMessage('上传内容中……')
    const editedImage = await compressEditedCanvas(canvas)
    if (!editedImage) {
      setIsSubmitting(false)
      setSubmitMessage('截图压缩失败，请减少图片内容后重试。')
      return
    }

    const data = new FormData()
    data.set('image', new File([editedImage], 'gsc-checkin.jpg', { type: 'image/jpeg' }))
    data.set('hours', hours)
    data.set('backlinks', backlinks)
    data.set('quality', String(quality))
    data.set('log', log)

    try {
      const result = await submitCheckinFn({ data })
      if (result.status === 'created') {
        setSubmitMessage(`今日已打卡，截图已压缩到 ${Math.ceil(result.record.imageBytes / 1024)}KB。`)
        onSuccess?.(result.record, result.currentStreak)
      } else if (result.status === 'already_checked_in') {
        setSubmitMessage('今天已经打卡，已为陛下显示当天记录。')
        onSuccess?.(result.record, result.currentStreak)
      } else {
        setSubmitMessage(result.message)
      }
    } catch {
      setSubmitMessage('保存失败，请检查网络后重试；当前表单内容已保留。')
    } finally {
      setIsSubmitting(false)
    }
  }

  /** 实时显示日志中的汉字数量，和提交时的最低字数校验保持一致。 */
  const logChineseCount = countChineseCharacters(log)

  return (
    <Card className="mx-auto mt-8 w-full max-w-[640px] p-5 sm:p-6">

      <form onSubmit={handleSubmit} onPaste={handlePaste} className="grid gap-5">
        {/* 1. GSC 截图：选择后先在浏览器内打码，图片不会单独上传 */}
        <div className="grid gap-1.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="daily-gsc-screenshot">
              1. 今天主攻的站{' '}
              <a
                href="https://search.google.com/search-console"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#26384d] underline decoration-[#26384d]/20 underline-offset-2 transition-colors hover:text-[#1d5b8f] dark:text-[#c6d4e4] dark:decoration-[#c6d4e4]/25 dark:hover:text-[#a9c9e8]"
              >
                GSC
              </a>{' '}
              截图
            </Label>
            <FieldHint text="用于证明今天主要工作的站点数据，选择图片后可以先用画笔遮挡敏感信息。" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              ref={fileInputRef}
              id="daily-gsc-screenshot"
              name="gscScreenshot"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
              onChange={handleImageChange}
              className="h-auto min-h-[42px] w-[400px] shrink-0 rounded-[7px] border border-input bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-soft file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary"
              style={{ width: '400px', minWidth: '400px' }}
            />
          </div>
          <Textarea
            aria-label="粘贴 GSC 截图"
            rows={2}
            placeholder="或在此粘贴截图"
            onPaste={handlePasteBox}
            className="min-h-[64px] w-[600px] min-w-[600px] resize-none"
            style={{ width: '600px', minWidth: '600px' }}
          />
          {gscFile && <p className="m-0 text-xs text-fg-3">已选择：{gscFile.name}</p>}
          {editorError && <p className="m-0 text-sm text-destructive" role="alert">{editorError}</p>}
        </div>

        <div className={imageReady ? 'grid gap-3 rounded-lg border border-border bg-bg-alt p-3 sm:p-4' : 'hidden'}>
            {/* 将恢复按钮与画笔操作放在同一行，并统一靠右对齐。 */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2" role="group" aria-label="画笔类型">
                <Button
                  type="button"
                  size="sm"
                  variant={brushTool === 'mosaic' ? 'default' : 'outline'}
                  aria-pressed={brushTool === 'mosaic'}
                  onClick={() => setBrushTool('mosaic')}
                  disabled={!imageReady}
                >
                  马赛克
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={brushTool === 'red' ? 'default' : 'outline'}
                  aria-pressed={brushTool === 'red'}
                  onClick={() => setBrushTool('red')}
                  disabled={!imageReady}
                >
                  涂抹
                </Button>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={resetEditor} disabled={!imageReady}>恢复原图</Button>
            </div>

            <div className="overflow-auto rounded-md border border-border bg-background p-2">
              <canvas
                ref={canvasRef}
                className={`${imageReady ? 'mx-auto block cursor-cell' : 'hidden'} h-auto w-full touch-none`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                aria-label="GSC 截图编辑画布"
              />
            </div>
        </div>

        {/* 2. 出海时长：页面展示四档中文选项，提交时使用 A/B/C/D 枚举。 */}
        <div className="grid gap-1.5">
          <div className="flex items-center gap-1.5">
            <Label>2. 今天出海了几小时？</Label>
            <FieldHint text="按今天实际投入出海工作的时间选择，不需要精确到分钟。" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="今天出海了几个小时">
            {HOURS_OPTIONS.map((option) => (
              <label key={option.value} className={`flex cursor-pointer items-center justify-center rounded-md border px-3 py-2.5 text-sm font-semibold transition-colors ${hours === option.value ? 'border-primary bg-soft text-primary' : 'border-border bg-background text-foreground hover:bg-bg-alt'}`}>
                <input
                  className="sr-only"
                  type="radio"
                  name="hours"
                  value={option.value}
                  checked={hours === option.value}
                  onChange={() => { setHours(option.value); setSubmitMessage(null) }}
                  required
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        {/* 3. 外链数量：页面展示四档中文选项，提交时使用 A/B/C/D 枚举。 */}
        <div className="grid gap-1.5">
          <div className="flex items-center gap-1.5">
            <Label>3. 今天添加了几外链？</Label>
            <FieldHint text="填写今天新增外链数量，按实际情况选择即可。" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="今天添加了几个外链">
            {BACKLINK_OPTIONS.map((option) => (
              <label key={option.value} className={`flex cursor-pointer items-center justify-center rounded-md border px-3 py-2.5 text-sm font-semibold transition-colors ${backlinks === option.value ? 'border-primary bg-soft text-primary' : 'border-border bg-background text-foreground hover:bg-bg-alt'}`}>
                <input
                  className="sr-only"
                  type="radio"
                  name="backlinks"
                  value={option.value}
                  checked={backlinks === option.value}
                  onChange={() => { setBacklinks(option.value); setSubmitMessage(null) }}
                  required
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        {/* 4. 工作质量：1 到 10 的十档滑杆，并实时显示当前分数 */}
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="daily-quality">4. 今天的上站工作质量，自评几分？</Label>
              <FieldHint text="根据今天上站工作的整体完成度、质量和效果进行自评。" />
            </div>
            <span className="min-w-12 rounded-md bg-soft px-2 py-1 text-center font-mono text-lg font-semibold text-primary">
              {quality}/10
            </span>
          </div>
          <input
            id="daily-quality"
            name="quality"
            type="range"
            min={1}
            max={10}
            step={1}
            value={quality}
            onChange={(event) => {
              setQuality(Number(event.target.value))
              setSubmitMessage(null)
            }}
            className="h-2 w-full cursor-pointer accent-primary"
            aria-valuetext={`${quality} 分，共 10 分`}
          />
          <div className="flex justify-between px-0.5 font-mono text-xs text-fg-3" aria-hidden="true">
            {Array.from({ length: 10 }, (_, index) => <span key={index + 1}>{index + 1}</span>)}
          </div>
        </div>

        {/* 5. 工作日志：至少 20 个汉字，最多 2000 个字符；达到上限时才提醒。 */}
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="daily-log">5. 今天的工作日志</Label>
              <FieldHint text="记录今天做了什么、最大问题是什么，以及明天决定做什么。" />
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`font-mono text-sm font-semibold ${logChineseCount >= 20 ? 'text-black' : 'text-fg-3'}`}
                aria-live="polite"
              >
                {logChineseCount} / 20
              </span>
              {log.length >= 2000 && <span className="text-xs text-destructive">已达到 2000 字符上限</span>}
            </div>
          </div>
          <Textarea
            id="daily-log"
            name="log"
            required
            maxLength={2000}
            rows={7}
            value={log}
            onChange={(event) => {
              setLog(event.target.value)
              setSubmitMessage(event.target.value.length >= 2000 ? '工作日志已达到 2000 字符上限。' : null)
            }}
            placeholder="今天做了... 最大的问题是... 明天决定..."
            aria-describedby="daily-log-hint"
          />
        </div>

        <div className="grid gap-2 pt-1">
          <Button type="submit" size="lg" disabled={isSubmitting} className="mx-auto w-full max-w-[240px]">
            {isSubmitting ? '正在保存……' : '提交'}
          </Button>
          {submitMessage && <p className="m-0 text-sm text-success" role="status">{submitMessage}</p>}
        </div>
      </form>
    </Card>
  )
}
