import type { GuideSection } from '@homexbd/shared';

export const FREE_GUIDE_FALLBACK: GuideSection[] = [
  {
    id: 'free-plan-first',
    slug: 'plan-first',
    titleBn: 'সঠিক প্ল্যানিং দিয়ে শুরু করুন',
    bodyBn: [
      'কাজ শুরুর আগে পুরো ডিজাইন ও বাজেট চূড়ান্ত করুন।',
      'মাঝপথে পরিবর্তন করলে অতিরিক্ত খরচ হয়।',
      'পেশাদার পরিকল্পনা ব্যবহার করুন।',
    ],
    sortOrder: 10,
    accessTier: 'free',
  },
  {
    id: 'free-simple-design',
    slug: 'simple-design',
    titleBn: 'সিম্পল ডিজাইন বেছে নিন',
    bodyBn: [
      'জটিল ডিজাইন খরচ বাড়ায়।',
      'রেক্ট্যাঙ্গুলার বা স্কয়ার ডিজাইন সাধারণত সাশ্রয়ী।',
      'কম দেয়াল মানে কম খরচ।',
    ],
    sortOrder: 20,
    accessTier: 'free',
  },
  {
    id: 'free-right-season',
    slug: 'right-season',
    titleBn: 'সঠিক সময়ে কাজ শুরু করুন',
    bodyBn: ['বর্ষা এড়িয়ে চলুন।', 'শুষ্ক মৌসুমে কাজ দ্রুত ও কম খরচে হয়।'],
    sortOrder: 30,
    accessTier: 'free',
  },
];
