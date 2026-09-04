import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'

/** 通用图片灯箱幻灯片；其他页面可以复用同一套左右切换和缩放能力。 */
export interface ImageLightboxSlide {
  src: string
  alt?: string
  title?: string
}

/**
 * 受控图片灯箱。
 * openIndex 为 null 时关闭；调用方通过 slides 传入当前页面或当前内容集合的图片。
 */
export function ImageLightbox({ slides, openIndex, onClose }: { slides: ImageLightboxSlide[]; openIndex: number | null; onClose: () => void }) {
  return (
    <Lightbox
      open={openIndex !== null}
      close={onClose}
      index={openIndex ?? 0}
      slides={slides}
      plugins={[Zoom]}
      zoom={{ maxZoomPixelRatio: 4, scrollToZoom: true }}
    />
  )
}
