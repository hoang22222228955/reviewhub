import styles from './ReviewPreview.module.css'

function getStatusLabel(status) {
  return status || 'pending'
}

function getRatingText(rating) {
  const value = Number(rating || 0)
  if (value >= 4.5) return 'Xuất sắc'
  if (value >= 4) return 'Tốt'
  if (value >= 3) return 'Ổn định'
  return 'Cần xem lại'
}

export default function ReviewPreview({ review }) {
  if (!review) {
    return (
      <aside className={styles.panel}>
        <div className={styles.empty}>
          <span>Preview</span>
          <h3>Chưa có review</h3>
          <p>Review vừa gửi sẽ nằm ở hàng chờ kiểm duyệt trước khi hiển thị cho partner.</p>
        </div>
      </aside>
    )
  }

  const percent = Math.max(0, Math.min(100, (Number(review.rating || 0) / 5) * 100))
  const previewImage = review.imageUrl || review.reviewImage || review.localImagePreviewUrl || review.imagePreviewUrl || ''

  return (
    <aside className={styles.panel}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Review preview</p>
          <h3>{review.targetName || 'Review vừa gửi'}</h3>
          <p>Thông tin đã chuẩn hóa và đang chờ admin kiểm duyệt.</p>
        </div>

        <span className={styles.status}>{getStatusLabel(review.moderationStatus)}</span>
      </header>

      <section className={styles.scoreBlock}>
        <div>
          <span>Rating</span>
          <strong>{review.rating || 0}</strong>
          <small>/ 5 · {getRatingText(review.rating)}</small>
        </div>

        <div className={styles.progressWrap}>
          <span>{getRatingText(review.rating)}</span>
          <div className={styles.track}>
            <div className={styles.fill} style={{ width: `${percent}%` }} />
          </div>
        </div>
      </section>

      <dl className={styles.metaList}>
        <div>
          <dt>Mã đối tượng</dt>
          <dd>{review.targetCode || review.operatorCode || '—'}</dd>
        </div>
        <div>
          <dt>Danh mục</dt>
          <dd>{review.category || '—'}</dd>
        </div>
        <div>
          <dt>Phạm vi</dt>
          <dd>{review.visibility || '—'}</dd>
        </div>
        <div>
          <dt>Kiểm duyệt</dt>
          <dd>{getStatusLabel(review.moderationStatus)}</dd>
        </div>
      </dl>

      <section className={styles.comment}>
        <span>Nội dung đánh giá</span>
        <p>{review.comment || 'Chưa có nội dung đánh giá.'}</p>
      </section>

      {previewImage && (
        <section className={styles.imagePreview}>
          <div>
            <span>Ảnh đánh giá</span>
            {review.imageFileName && <small>{review.imageFileName}</small>}
          </div>

          <img src={previewImage} alt="Ảnh đánh giá vừa gửi" />
        </section>
      )}
    </aside>
  )
}
