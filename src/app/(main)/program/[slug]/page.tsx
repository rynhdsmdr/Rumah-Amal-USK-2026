'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import ShareAndLikeBar from '@/components/ShareAndLikeBar';

interface ProgramDetail {
  id: string;
  title: string;
  titleAr?: string | null;
  titleEn?: string | null;
  slug: string;
  category: string;
  coverImageUrl: string | null;
  content: string;
  contentAr?: string | null;
  contentEn?: string | null;
  viewsCount: number;
  likesCount?: number;
  publishedAt: string | null;
  createdAt: string;
}

interface RegistrationInfo {
  hasRegistration: boolean;
  isOpen: boolean;
  registrationSlug: string;
  programName: string;
  tanggalTutup?: string | null;
}

type Language = 'id' | 'en' | 'ar';

export default function PublicProgramDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [registrationInfo, setRegistrationInfo] = useState<RegistrationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Language>('id');

  // Client-side auto translation state for missing DB translations
  const [translating, setTranslating] = useState(false);
  const [autoArTitle, setAutoArTitle] = useState('');
  const [autoArContent, setAutoArContent] = useState('');
  const [autoEnTitle, setAutoEnTitle] = useState('');
  const [autoEnContent, setAutoEnContent] = useState('');

  useEffect(() => {
    const readLang = () => {
      const savedLang = (localStorage.getItem('app_lang') || localStorage.getItem('program_lang')) as Language;
      if (savedLang && ['id', 'en', 'ar'].includes(savedLang)) {
        setLang(savedLang);
      }
    };
    readLang();
    window.addEventListener('languageChange', readLang);
    return () => window.removeEventListener('languageChange', readLang);
  }, []);

  const changeLanguage = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('program_lang', newLang);
  };

  const fetchProgramDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/program');
      if (res.ok) {
        const data = await res.json();
        const list: ProgramDetail[] = data.programs || [];
        const found = list.find((p) => p.slug === slug);
        if (found) {
          setProgram(found);
          if (found.id) {
            fetch(`/api/program/${found.id}/views`, { method: 'POST' }).catch(() => {});
          }
        }
      }

      // Periksa apakah program ini memiliki formulir pendaftaran beasiswa/bantuan di database Neon
      try {
        const checkRes = await fetch(`/api/pendaftaran/check-by-slug?slug=${encodeURIComponent(slug)}`);
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.hasRegistration) {
            setRegistrationInfo(checkData);
          }
        }
      } catch (checkErr) {
        console.error('Error checking registration info:', checkErr);
      }
    } catch (err) {
      console.error('Error fetching program detail:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchProgramDetail();
  }, [fetchProgramDetail]);

  // Handle on-the-fly auto translation when DB fields are missing
  useEffect(() => {
    if (!program) return;

    async function triggerAutoTranslate() {
      if (!program) return;

      if (lang === 'ar' && !program.titleAr && !autoArTitle && !translating) {
        setTranslating(true);
        try {
          const res = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: program.title,
              content: program.content,
              targetLang: 'ar',
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.title) setAutoArTitle(data.title);
            if (data.content) setAutoArContent(data.content);
          }
        } catch (e) {
          console.error('Auto translate AR error:', e);
        } finally {
          setTranslating(false);
        }
      } else if (lang === 'en' && !program.titleEn && !autoEnTitle && !translating) {
        setTranslating(true);
        try {
          const res = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: program.title,
              content: program.content,
              targetLang: 'en',
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.title) setAutoEnTitle(data.title);
            if (data.content) setAutoEnContent(data.content);
          }
        } catch (e) {
          console.error('Auto translate EN error:', e);
        } finally {
          setTranslating(false);
        }
      }
    }

    triggerAutoTranslate();
  }, [lang, program, autoArTitle, autoEnTitle, translating]);

  const getDisplayTitle = (item: ProgramDetail) => {
    if (lang === 'en') return item.titleEn || autoEnTitle || item.title;
    if (lang === 'ar') return item.titleAr || autoArTitle || item.title;
    return item.title;
  };

  const getDisplayContent = (item: ProgramDetail) => {
    if (lang === 'en') return item.contentEn || autoEnContent || item.content;
    if (lang === 'ar') return item.contentAr || autoArContent || item.content;
    return item.content;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-4xl mx-auto animate-pulse">
          <div className="h-8 bg-gray-200 w-3/4 mx-auto rounded mb-6" />
          <div className="h-4 bg-gray-200 w-1/3 mb-8" />
          <div className="h-80 bg-gray-100 rounded-3xl max-w-[420px] mx-auto mb-8" />
          <div className="bg-white rounded-3xl p-8 border border-gray-100 space-y-3">
            <div className="h-4 bg-gray-200 w-full rounded" />
            <div className="h-4 bg-gray-200 w-5/6 rounded" />
            <div className="h-4 bg-gray-200 w-4/6 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-white py-16 px-4 text-center font-sans">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {lang === 'ar' ? 'البرنامج غير موجود' : lang === 'en' ? 'Program Not Found' : 'Program Tidak Ditemukan'}
        </h2>
        <p className="text-gray-500 mb-6">
          {lang === 'ar'
            ? 'البرنامج الذي تبحث عنه غير متوفر أو تم حذفه.'
            : lang === 'en'
            ? 'The program you are looking for is unavailable or has been removed.'
            : 'Program yang Anda cari tidak tersedia atau telah dihapus.'}
        </p>
        <Link href="/program" className="px-5 py-2.5 bg-[#0b6330] text-white font-bold rounded-xl text-sm">
          {lang === 'ar' ? 'العودة إلى قائمة البرامج' : lang === 'en' ? 'Back to Program List' : 'Kembali ke Daftar Program'}
        </Link>
      </div>
    );
  }

  const displayTitle = getDisplayTitle(program);
  const displayContent = getDisplayContent(program);

  const isTitleRtl = lang === 'ar';
  const isContentRtl = lang === 'ar';

  return (
    <div className="min-h-screen bg-[#f8fafc]/40 py-8 px-4 sm:px-6 lg:px-8 font-sans text-gray-800">
      <div className="max-w-5xl mx-auto">

        {/* Top bar with Back Link */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <Link
            href="/program"
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#0b6330] hover:underline"
          >
            ← {lang === 'ar' ? 'العودة إلى جميع البرامج' : lang === 'en' ? 'Back to all programs' : 'Kembali ke Semua Program'}
          </Link>

          {translating && (
            <span className="text-[11px] text-[#0b6330] font-bold animate-pulse px-2 flex items-center gap-1 self-end sm:self-auto">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              {lang === 'ar' ? 'جاري الترجمة…' : 'Translating…'}
            </span>
          )}
        </div>

        {/* 1. Main Title */}
        <div className="text-center my-6" dir={isTitleRtl ? 'rtl' : 'ltr'}>
          <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#333333] tracking-tight uppercase max-w-4xl mx-auto leading-tight mb-4 ${isTitleRtl ? 'font-serif' : ''}`}>
            {displayTitle}
          </h1>
        </div>

        {/* 3. Centered Poster Image Card */}
        {program.coverImageUrl ? (
          <div className="max-w-[420px] mx-auto rounded-[28px] overflow-hidden shadow-lg mb-10 border border-gray-100 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={program.coverImageUrl}
              alt={displayTitle}
              className="w-full h-auto object-cover rounded-[28px]"
            />
          </div>
        ) : null}

        {/* 4. Rounded White Container for Content */}
        <div className="max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-10 lg:p-12 shadow-sm border border-gray-100/90 mb-12">
          <div className="prose max-w-none text-gray-800">
            <style>{`
              .program-detail-content a[data-type="download-button"],
              .program-detail-content a[data-type="link-button"],
              .program-detail-content a[download],
              .program-detail-content div.my-4 a,
              .program-detail-content div:has(> a[data-type="download-button"]),
              .program-detail-content div:has(> a[data-type="link-button"]) {
                display: flex !important;
                width: 100% !important;
                justify-content: center !important;
                text-align: center !important;
                box-sizing: border-box !important;
                border-radius: 16px !important;
                direction: ltr !important;
                unicode-bidi: isolate !important;
              }
              .program-detail-content a[data-type="download-button"],
              .program-detail-content a[data-type="link-button"],
              .program-detail-content a[download],
              .program-detail-content div.my-4 a {
                background: #0b6330 !important;
                color: #ffffff !important;
                padding: 12px 24px !important;
                font-weight: 700 !important;
                text-decoration: none !important;
                font-size: 14px !important;
                box-shadow: 0 2px 8px rgba(11, 99, 48, 0.25) !important;
                margin: 16px 0 !important;
              }
              .program-detail-content p { margin-bottom: 1.25rem; line-height: 1.8; font-size: 1rem; color: #374151; }
              .program-detail-content h1 { font-size: 1.6rem; font-weight: 800; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #111827; }
              .program-detail-content h2 { font-size: 1.3rem; font-weight: 800; margin-top: 1.5rem; margin-bottom: 0.65rem; color: #111827; }
              .program-detail-content h3 { font-size: 1.1rem; font-weight: 800; margin-top: 1.25rem; margin-bottom: 0.5rem; color: #111827; }
              .program-detail-content ul { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1.25rem; }
              .program-detail-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1.25rem; }
              .program-detail-content li { margin-bottom: 0.35rem; line-height: 1.7; color: #374151; font-size: 0.95rem; }
              .program-detail-content blockquote { border-left: 4px solid #d1d5db; padding-left: 1rem; color: #6b7280; font-style: italic; margin: 1.25rem 0; }
              .program-detail-content a { color: #0b6330; text-decoration: underline; font-weight: 600; }
              .program-detail-content img { max-width: 100%; height: auto; border-radius: 1rem; margin: 1.25rem 0; }
              .program-detail-content strong { font-weight: 800; color: #111827; }
              .rtl-body { direction: rtl; text-align: right; font-family: serif, sans-serif; }
              .rtl-body blockquote { border-left: none; border-right: 4px solid #0b6330; padding-left: 0; padding-right: 1rem; }
              .rtl-body ul, .rtl-body ol { padding-left: 0; padding-right: 1.5rem; }
            `}</style>
            <div
              className={`program-detail-content ${isContentRtl ? 'rtl-body' : 'ltr-body'}`}
              dir={isContentRtl ? 'rtl' : 'ltr'}
              dangerouslySetInnerHTML={{ __html: displayContent || '<p class="text-gray-400 italic text-center py-4">(Belum ada konten dalam bahasa ini)</p>' }}
            />
          </div>

          {/* CTA Banner Pendaftaran Program */}
          {registrationInfo && (
            <div className="my-8 rounded-3xl overflow-hidden bg-gradient-to-br from-[#063A1E] via-[#0b6330] to-[#005621] text-white p-6 sm:p-8 shadow-xl border border-emerald-600/30 relative">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2 flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur-xs text-[#ffc800] border border-white/10">
                    <span className={`w-2 h-2 rounded-full ${registrationInfo.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                    {registrationInfo.isOpen
                      ? (lang === 'ar' ? 'التسجيل مفتوح' : lang === 'en' ? 'Registration Open' : 'Pendaftaran Dibuka')
                      : (lang === 'ar' ? 'التسجيل مغلق' : lang === 'en' ? 'Registration Closed' : 'Pendaftaran Ditutup')}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    {lang === 'ar'
                      ? `هل ترغب في التسجيل في ${registrationInfo.programName}؟`
                      : lang === 'en'
                      ? `Interested in Applying for ${registrationInfo.programName}?`
                      : `Tertarik Mendaftar ${registrationInfo.programName}?`}
                  </h3>
                  <p className="text-xs sm:text-sm text-white/80 leading-relaxed max-w-xl">
                    {registrationInfo.isOpen
                      ? (lang === 'ar'
                        ? 'استمارة التقديم عبر الإنترنت وتحميل المستندات المطلوبة متاحة الآن. يرجى إكمال بياناتك ومستنداتك.'
                        : lang === 'en'
                        ? 'Online application and document submission are now open. Please complete your biodata and required files.'
                        : 'Formulir pendaftaran daring dan pengunggahan berkas persyaratan kini telah dibuka. Silakan klik tombol di bawah untuk melengkapi biodata dan berkas Anda.')
                      : (lang === 'ar'
                        ? 'التسجيل في هذا البرنامج مغلق حالياً.'
                        : lang === 'en'
                        ? 'Registration for this program is currently closed.'
                        : 'Pendaftaran untuk program ini saat ini sedang tidak dibuka.')}
                  </p>
                  {registrationInfo.tanggalTutup && registrationInfo.isOpen && (
                    <p className="text-xs font-semibold text-[#ffc800] flex items-center gap-1.5 pt-1">
                      <span>⏳</span>
                      <span>
                        {lang === 'ar' ? 'الموعد النهائي: ' : lang === 'en' ? 'Deadline: ' : 'Batas Akhir: '}
                        {new Date(registrationInfo.tanggalTutup).toLocaleDateString(lang === 'ar' ? 'ar-SA' : lang === 'en' ? 'en-US' : 'id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </p>
                  )}
                </div>

                {registrationInfo.isOpen ? (
                  <Link
                    href={`/pendaftaran/${registrationInfo.registrationSlug}`}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#f5b016] hover:bg-[#ffc800] text-[#063A1E] font-extrabold text-sm sm:text-base shadow-lg hover:shadow-xl hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 whitespace-nowrap cursor-pointer self-stretch md:self-auto"
                  >
                    <span>
                      {lang === 'ar' ? 'سجل الآن' : lang === 'en' ? 'Apply Now' : 'Daftar Program Sekarang'}
                    </span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                ) : (
                  <span className="px-5 py-3 rounded-xl bg-white/10 text-white/60 font-semibold text-sm cursor-not-allowed">
                    {lang === 'ar' ? 'التسجيل مغلق' : lang === 'en' ? 'Closed' : 'Pendaftaran Ditutup'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Jumlah Pembaca / Views Count */}
          <div className="flex items-center gap-2 text-gray-600 text-sm font-semibold pt-6 mb-6 border-t border-gray-100" title="Jumlah Pembaca / Views">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-gray-800 font-extrabold text-base">{program.viewsCount || 0}</span>
            <span className="text-xs text-gray-500 font-medium">
              {lang === 'ar' ? 'مشاهدة' : lang === 'en' ? 'views' : 'pembaca'}
            </span>
          </div>

          {/* Share & Like Section */}
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200/80 shadow-2xs mb-6">
            <ShareAndLikeBar
              contentType="program"
              contentId={program.id}
              title={displayTitle}
              initialLikesCount={program.likesCount || 0}
              lang={lang}
            />
          </div>

          {/* Bottom Back Button */}
          <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
            <Link
              href="/program"
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#0b6330] hover:underline"
            >
              ← {lang === 'ar' ? 'العودة إلى قائمة البرامج' : lang === 'en' ? 'Back to Program List' : 'Kembali ke Daftar Program'}
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
