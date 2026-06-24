import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import * as HugeIcons from '@hugeicons/core-free-icons';
import Button from '../../../shared/ui/Button/Button';
import {
  CATEGORIES,
  DEFAULT_PLANS,
  TRUSTED_NAMES,
} from '../../../shared/lib/defaultData';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import HeroIllustration from '../../components/Hero/HeroIllustration';
import styles from './HomePage.module.css';

/*
  LUU Y QUAN TRONG:
  Object nay KHONG PHAI du lieu DB. Day chi la map ten 6 card tren UI sang URL.
  DB cua ban co bang transport_operators cho Nha xe. Cac muc khac neu chua co bang/API
  thi ServiceCategoryPage se hien du lieu demo de giao dien khong bi trang.
*/

const getHugeIcon = (...names) => {
  for (const name of names) {
    if (HugeIcons[name]) return HugeIcons[name];
  }

  return (
    Object.values(HugeIcons).find((item) => Array.isArray(item)) ||
    Object.values(HugeIcons)[0]
  );
};

const CATEGORY_ROUTES = {
  'Nhà xe': 'nha-xe',
  'Khách sạn': 'khach-san',
  'Máy bay': 'may-bay',
  'Tàu hỏa': 'tau-hoa',
  Tour: 'tour',
  'Dịch vụ khác': 'dich-vu-khac',
};

const CATEGORY_ICONS = {
  'Nhà xe': getHugeIcon('Bus01Icon', 'BusIcon', 'Bus02Icon', 'Bus03Icon'),
  'Khách sạn': getHugeIcon('Hotel01Icon', 'Building03Icon', 'Building04Icon', 'BuildingsIcon', 'BuildingIcon'),
  'Máy bay': getHugeIcon('AirplaneTakeOff01Icon', 'Airplane01Icon', 'AirplaneTakeOffIcon', 'AirplaneIcon'),
  'Tàu hỏa': getHugeIcon('Train01Icon', 'Train02Icon', 'TrainIcon'),
  Tour: getHugeIcon('MountainIcon', 'Mountain01Icon', 'Location01Icon', 'MapingIcon', 'Map01Icon'),
  'Dịch vụ khác': getHugeIcon('CustomerSupportIcon', 'CustomerServiceIcon', 'HeadsetIcon', 'HeadsetHelpIcon'),
};


const HOME_AI_WORKFLOW_STEPS = [
  {
    title: 'Khách hàng gửi đánh giá',
    description:
      'Người dùng chấm điểm sao, viết nhận xét và chia sẻ trải nghiệm sau khi sử dụng dịch vụ.',
    toneClass: 'homeAiToneBlue',
    icon: getHugeIcon('TaskEdit02Icon', 'Edit02Icon', 'PencilEdit02Icon', 'NoteEditIcon'),
  },
  {
    title: 'AI kiểm duyệt nội dung',
    description:
      'AI phát hiện spam, nội dung độc hại, đánh giá ảo hoặc hành vi bất thường.',
    toneClass: 'homeAiToneIndigo',
    icon: getHugeIcon('AiChipIcon', 'ChipIcon', 'CpuIcon', 'ArtificialIntelligence01Icon'),
  },
  {
    title: 'Tính điểm uy tín',
    description:
      'Tổng hợp điểm sao, số lượt đánh giá, mức hài lòng và lịch sử chất lượng.',
    toneClass: 'homeAiToneEmerald',
    icon: getHugeIcon('ChartBarIcon', 'Analytics01Icon', 'Chart01Icon', 'BarChartIcon'),
  },
  {
    title: 'Xếp hạng đối tác',
    description:
      'Cập nhật bảng xếp hạng theo từng lĩnh vực, ưu tiên điểm uy tín mới nhất.',
    toneClass: 'homeAiToneAmber',
    icon: getHugeIcon('Trophy01Icon', 'TrophyIcon', 'Award01Icon', 'Medal01Icon'),
  },
  {
    title: 'Gợi ý thông minh',
    description:
      'Đề xuất đối tác phù hợp và ưu tiên đơn vị có chất lượng dịch vụ tốt.',
    toneClass: 'homeAiToneSky',
    icon: getHugeIcon('Target01Icon', 'Target02Icon', 'Aim01Icon', 'SparklesIcon'),
  },
];

const HOME_CUSTOMER_VOICE_CARDS = [
  {
    name: 'Phạm Nhật Quốc',
    role: 'Khách hàng đặt xe',
    initials: 'MQ',
    quote:
      'Tôi dễ dàng xem điểm uy tín, đọc nhận xét thật và chọn được nhà xe phù hợp trước khi đặt vé.',
    avatar: '/images/avatars/khach-hang-viet-1.jpg',
  },
  {
    name: 'Hoàng Nhật Minh',
    role: 'Quản lý khách sạn',
    initials: 'TD',
    quote:
      'Trang quản lý phản hồi rất rõ ràng, giúp khách sạn theo dõi đánh giá và cải thiện chất lượng dịch vụ.',
    avatar: '/images/avatars/khach-hang-viet-2.jpg',
  },
  {
    name: 'Trần Minh Hoàng',
    role: 'Quản trị hệ thống',
    initials: 'AT',
    quote:
      'Cơ chế lọc đánh giá ảo và kiểm duyệt AI giúp dữ liệu sạch hơn, đáng tin cậy hơn khi cung cấp qua API.',
    avatar: '/images/avatars/khach-hang-viet-3.jpg',
  },
];

function CategoryMedia({ src, title }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={styles.categoryFallback} aria-hidden="true">
        <div className={styles.categoryFallbackMark}>RH</div>
        <div className={styles.categoryFallbackText}>{title}</div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title}
      className={styles.categoryImage}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}


function CustomerAvatar({ src, name, initials }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span className={styles.homeVoiceAvatarFallback} aria-label={name}>
        {initials}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export default function HomePage() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const targets = root.querySelectorAll('[data-reveal]');
    if (!targets.length) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.setAttribute('data-reveal', 'in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-reveal', 'in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 }
    );

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const featuredPlan = useMemo(() => {
    return DEFAULT_PLANS.find((item) => item.featured) || DEFAULT_PLANS[1] || DEFAULT_PLANS[0];
  }, []);

  const handleHeroMove = (event) => {
    const reduceMotion =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    event.currentTarget.style.setProperty('--mx', `${x.toFixed(1)}%`);
    event.currentTarget.style.setProperty('--my', `${y.toFixed(1)}%`);
  };

  const handleHeroLeave = (event) => {
    event.currentTarget.style.removeProperty('--mx');
    event.currentTarget.style.removeProperty('--my');
  };

  return (
    <div ref={rootRef} className={`pageContainer ${styles.page}`}>
      <section
        className={styles.hero}
        data-reveal="out"
        onMouseMove={handleHeroMove}
        onMouseLeave={handleHeroLeave}
      >
        <div className={styles.heroContent}>
          <div className={styles.eyebrow}>Review API platform</div>

          <h1 className={styles.heroTitle}>
            Kho review tập trung cho đối tác lấy, gửi và kiểm soát dữ liệu qua{' '}
            <span className={styles.heroTitleAccent}>API</span>.
          </h1>

          <p className={styles.heroText}>
            ReviewHub là data hub dành cho partner: mua gói, nhận API key, lấy review đúng phạm vi,
            gửi review mới về hub và quản lý public/private cùng AI moderation trong một hệ thống thống nhất.
          </p>

          <div className={styles.heroActions}>
            <Button as={Link} to="/bang-gia">Xem bảng giá</Button>
            <Button as={Link} to="/dang-ky" variant="secondary">Tạo tài khoản</Button>
            <Button as={Link} to="/tai-lieu-api" variant="ghost">Đọc tài liệu API</Button>
          </div>

          <div className={styles.miniStrip}>
            <span>API key theo partner</span>
            <span>Public / private tách rõ</span>
            <span>AI moderation đầu vào</span>
            <span>Quota theo gói dịch vụ</span>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <strong>{DEFAULT_PLANS.length}</strong>
              <span>gói dịch vụ</span>
            </div>
            <div className={styles.heroStat}>
              <strong>{CATEGORIES.length}</strong>
              <span>nhóm dữ liệu</span>
            </div>
            <div className={styles.heroStat}>
              <strong>2 chiều</strong>
              <span>lấy review / gửi review</span>
            </div>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.heroVisualMain}>
            <HeroIllustration />
          </div>

          <div className={styles.heroFloatingCard}>
            <div className={styles.heroFloatingLabel}>Gói nổi bật</div>
            <div className={styles.heroFloatingTitle}>{featuredPlan?.name}</div>
            <div className={styles.heroFloatingPrice}>
              {featuredPlan?.price?.toLocaleString('vi-VN')} đ / {featuredPlan?.cycle}
            </div>

            <ul className={styles.heroFloatingList}>
              {featuredPlan?.privileges?.slice(0, 4).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.trust} data-reveal="out">
        <p className={styles.trustText}>
          Thiết kế theo tư duy SaaS / API platform: rõ quyền truy cập, dễ quét thông tin và đủ chất liệu để thuyết trình đồ án.
        </p>

        <div className={styles.trustList}>
          {TRUSTED_NAMES.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
      </section>

      <section className={styles.section} data-reveal="out">
        <SectionTitle
          eyebrow="Kho dữ liệu review"
          title="Dữ liệu đánh giá được tổ chức theo từng nhóm dịch vụ"
          description="Hệ thống tập trung review từ nhiều lĩnh vực, hỗ trợ người dùng tham khảo chất lượng dịch vụ và giúp đối tác truy cập dữ liệu đánh giá thông qua API."
        />

        <div className={styles.categoryGrid}>
          {CATEGORIES.map((item) => {
            const slug = CATEGORY_ROUTES[item.title] || 'dich-vu-khac';
            return (
              <Link
                key={item.title}
                to={`/dich-vu/${slug}`}
                className={styles.categoryCard}
                aria-label={`Xem danh sách ${item.title}`}
              >
                <div className={styles.categoryMedia}>
                  <CategoryMedia src={item.image} title={item.title} />
                  <div className={styles.categoryOverlay} />
                </div>

                <div className={styles.categoryBody}>
                  <span className={styles.categoryIcon} aria-hidden="true">
                    <HugeiconsIcon
                      icon={CATEGORY_ICONS[item.title] || CATEGORY_ICONS['Dịch vụ khác']}
                      size={24}
                      color="currentColor"
                      strokeWidth={1.7}
                      aria-hidden="true"
                    />
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <span className={styles.categoryOpen}>Xem danh sách →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className={`${styles.section} ${styles.homeAiReviewSection}`} data-reveal="out">
        <div className={styles.homeAiProcessPanel}>
          <div className={styles.homeAiProcessHeader}>
            <span className={styles.homeAiProcessBadge}>AI review workflow</span>
            <h2>Quy trình đánh giá và xếp hạng bằng AI</h2>
            <p>
              Hệ thống thu thập đánh giá, AI kiểm duyệt nội dung, tính điểm uy tín,
              xếp hạng đối tác và gợi ý những đối tác phù hợp nhất cho bạn.
            </p>
          </div>

          <div className={styles.homeAiStepGrid}>
            {HOME_AI_WORKFLOW_STEPS.map((step, index) => (
              <div key={step.title} className={styles.homeAiStepItem}>
                <div className={`${styles.homeAiStepIcon} ${styles[step.toneClass]}`}>
                  <HugeiconsIcon
                    icon={step.icon}
                    size={38}
                    color="currentColor"
                    strokeWidth={1.65}
                    aria-hidden="true"
                  />
                </div>

                {index < HOME_AI_WORKFLOW_STEPS.length - 1 && (
                  <span className={styles.homeAiStepArrow} aria-hidden="true">→</span>
                )}

                <span className={styles.homeAiStepNumber}>{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.homeCustomerVoiceHeader}>
          <span aria-hidden="true" />
          <h2>Khách hàng nói gì về Blu Review</h2>
          <span aria-hidden="true" />
        </div>

        <div className={styles.homeCustomerVoiceGrid}>
          {HOME_CUSTOMER_VOICE_CARDS.map((item) => (
            <article key={item.name} className={styles.homeCustomerVoiceCard}>
              <div className={styles.homeVoiceTop}>
                <span className={styles.homeQuoteIcon} aria-hidden="true">“</span>
                <div className={styles.homeStarList} aria-label="5 sao">★★★★★</div>
              </div>

              <p className={styles.homeVoiceQuote}>{item.quote}</p>

              <div className={styles.homeVoiceAuthor}>
                <CustomerAvatar src={item.avatar} name={item.name} initials={item.initials} />
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.role}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
