import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { colors } from '../theme';
import { Text, useLanguage } from '../i18n';

type GuideCategory = 'all' | 'rules' | 'tips' | 'materials';

type GuideArticle = {
  id: string;
  category: GuideCategory;
  categoryLabel: string;
  readTime: string;
  title: string;
  description: string;
  highlighted?: boolean;
  content: string[];
};

const GUIDE_ARTICLES: GuideArticle[] = [
  {
    id: 'guide-1',
    category: 'rules',
    categoryLabel: 'ব্যবহারবিধি',
    readTime: '২ মিনিট পাঠ',
    title: '১-মিনিট ক্যালকুলেটর ব্যবহারের সঠিক নিয়মাবলী',
    description:
      'কীভাবে জমির মাপ (কাঠা/শতাংশ/বর্গফুট) এবং ফাউন্ডেশন সেট করে নির্ভুল এস্টিমেট বের করবেন।',
    content: [
      '১. প্রতি ফ্লোরের সঠিক আয়তন: জমি যত কাঠা বা শতাংশই হোক না কেন, ভবনের প্রতি ফ্লোরের বিল্ট-আপ ফুটপ্রিন্ট ইনপুট দিন। ১ কাঠা = ৭২০ বর্গফুট এবং ১ শতাংশ = ৪৩৫.৬ বর্গফুট।',
      '২. ফাউন্ডেশন বনাম বর্তমান তলা: ফাউন্ডেশন ভবিষ্যতে যত তলা করবেন তার জন্য ডিজাইন হলেও, বর্তমান খরচের হিসাবে এখন যত তলা বানাবেন সেই সংখ্যা দিন।',
      '৩. কোয়ালিটি নির্বাচন: Economy ৩০০০৳, Standard ৩৫০০৳ এবং Premium ৪৫০০৳ প্রতি বর্গফুট। সাধারণত স্ট্যান্ডার্ড কোয়ালিটিতে বেশিরভাগ আবাসিক বাড়ি নির্মিত হয়।',
      '৪. এলাকা ভিত্তিক রেট: ঢাকা শহরে ম্যাটেরিয়াল পরিবহন ও মজুরি খরচের কারণে রেট ১০% বেশি এবং চট্টগ্রামে ৫% সমন্বয় করা হয়।',
      '৫. খরচের বিভাজন: সাধারণত মোট খরচের ৫০% মূল কাঠামো বা স্ট্রাকচারে, ৩০% ফিনিশিংয়ে, ১০% ইলেক্ট্রিক্যালে এবং ১০% প্লাম্বিংয়ে ব্যয় হয়।',
    ],
  },
  {
    id: 'guide-2',
    category: 'tips',
    categoryLabel: 'খরচ কমানোর টিপস',
    readTime: '৪ মিনিট পাঠ',
    title: 'বাড়ি নির্মাণে খরচ কমানোর ১০টি কার্যকরী উপায় (Bonus Guide)',
    description:
      'কাঠামোর মজবুতি ঠিক রেখেও ১৫-২০% পর্যন্ত নির্মাণ খরচ সাশ্রয় করার ইন্টেলিজেন্ট কৌশল।',
    highlighted: true,
    content: [
      '১. পরিকল্পনা ও ডিজাইন চূড়ান্ত করুন: কাজ শুরুর আগে আর্কিটেকচারাল এবং স্ট্রাকচারাল ডিজাইন সম্পন্ন করুন। মাঝপথে কোনো ডিজাইন পরিবর্তন খরচ বহুগুণ বাড়িয়ে দেয়।',
      '২. সহজ ও সরল জ্যামিতি বেছে নিন: আয়তাকার বা বর্গাকার বিন্যাস নির্মাণ খরচ ও কলাম-বিমের জটিলতা উল্লেখযোগ্য হারে কমায়। অপ্রয়োজনীয় জটিল কার্ভ এড়িয়ে চলুন।',
      '৩. শুকনো মৌসুমে কাজ করুন: বর্ষাকালে মাটি খনন ও ঢালাই কাজের ঝুঁকি ও খরচ বাড়ে। শুকনো মৌসুমে কাজ দ্রুত হয় এবং ম্যাটেরিয়ালের অপচয় রোধ পায়।',
      '৪. বাজেট নির্ধারণ ও নজরদারি: শুরুতেই একটি সুনির্দিষ্ট বাজেট তৈরি করুন এবং প্রতি সপ্তাহের খরচের হিসাব মিলিয়ে দেখুন। অপ্রয়োজনীয় অলংকরণ বাদ দিন।',
      '৫. সঠিক লোকাল উপাদান ব্যবহার: স্ট্রাকচারাল রড ও সিমেন্টে ছাড় না দিয়ে, লোকাল ভালো মানের ইট ও বালু ব্যবহার করে খরচ সাশ্রয় করুন।',
      '৬. অভিজ্ঞ রাজমিস্ত্রি ও ইঞ্জিনিয়ার দল: ভুল কাজ ভাঙা ও পুনর্নির্মাণের চেয়ে অভিজ্ঞ দল নিয়োগ দিলে কাজের অপচয় ও সামগ্রিক খরচ বহুলাংশে কমে।',
      '৭. পাইকারি মালামাল ক্রয়: ইট, বালু ও সিমেন্ট খুচরা কেনার বদলে সরাসরি পাইকারি বা ডিলার থেকে একসাথে কিনলে পরিবহন ও দরে বড় সাশ্রয় হয়।',
      '৮. ভবিষ্যৎ তলার সঠিক পরিকল্পনা: ভবিষ্যতে তলা বাড়ানোর ইচ্ছা থাকলে শুরুতেই ইঞ্জিনিয়ার দিয়ে উপযুক্ত ফাউন্ডেশন নিশ্চিত করুন।',
      '৯. ফিনিশিংয়ের কাজ ধাপে ধাপে করা: প্রাথমিক বাজেটে স্ট্রাকচার ও প্রয়োজনীয় ফিনিশিং শেষ করে বিলাসিতা বা অতিরিক্ত ইন্টেরিয়র কাজ পরে করুন।',
      '১০. প্লাম্বিং ও পাইপলাইনের আগাম ড্রয়িং: দেয়াল ও ছাদ প্লাস্টারের আগেই সমস্ত পাইপলাইন ও ক্যাবল ডাক্ট বসিয়ে নিন, যাতে পরে দেয়াল কাটতে না হয়।',
    ],
  },
  {
    id: 'guide-3',
    category: 'materials',
    categoryLabel: 'ম্যাটেরিয়াল যাচাই',
    readTime: '৩ মিনিট পাঠ',
    title: 'ভালো মানের ইট, রড ও সিমেন্ট চেনার সহজ উপায়',
    description:
      'নির্মাণ সাইটে মালামাল নামানোর আগে যে পরীক্ষাগুলো অবশ্যই নিজে করে নেবেন।',
    content: [
      '১. ১ নম্বর ইট চেনার উপায়: দুটি ইট একসাথে বাড়ি দিলে ধাতব ঘণ্টার মতো স্পষ্ট ‘টিন টিন’ শব্দ হবে। এটি সহজে ভাঙবে না এবং ২৪ ঘণ্টা পানিতে ভিজিয়ে রাখলে ওজনের ১৫% এর বেশি পানি শোষণ করবে না।',
      '২. রড (500W Grade) যাচাই: রডের গায়ে গ্রেড নম্বর ও প্রস্তুতকারক কোম্পানির নাম এমবস করা থাকতে হবে। রড ১৮০ ডিগ্রি বাঁক দিলে কোনো ফাটল সৃষ্টি হওয়া যাবে না।',
      '৩. সিমেন্টের সতেজতা পরীক্ষা: সিমেন্টের বস্তায় হাত দিলে ঠান্ডা অনুভূতি হবে, কোনো শক্ত দানা বা জমাট বাঁধা থাকবে না। এক চিমটি সিমেন্ট পানির গ্লাসে ফেললে তা অবিলম্বে না ডুবে কিছুক্ষণ ভেসে থেকে ধীরে ধীরে নিচে যাবে।',
      '৪. বালুর গুণগত মান: বালুতে কোনো কাদামাটি বা লবণাক্ততা থাকা চলবে না। হাতের তালুতে নিয়ে ঘষলে ময়লা লেগে না থাকলে তা প্লাস্টার ও ঢালাইয়ের জন্য উপযুক্ত।',
    ],
  },
  {
    id: 'guide-4',
    category: 'materials',
    categoryLabel: 'ম্যাটেরিয়াল যাচাই',
    readTime: '৩ মিনিট পাঠ',
    title: 'ফাউন্ডেশন ও ছাদ ঢালাইয়ের গুরুত্বপূর্ণ সতর্কতা',
    description:
      'ছাদ ঢালাই ও কিউরিংয়ের সময় সামান্য ভুলের কারণে ভবিষ্যতে ছাদ চুঁইয়ে পানি পড়তে পারে।',
    content: [
      '১. সঠিক মিশ্রণ অনুপাত: ছাদ ও কলাম ঢালাইয়ের ক্ষেত্রে ১:১.৫:৩ অথবা ১:২:৪ স্ট্যান্ডার্ড অনুপাত строго বজায় রাখুন।',
      '২. ভাইব্রেটর ব্যবহার: ঢালাই করার সময় প্রতিটি স্তরে সঠিক ভাইব্রেশন নিশ্চিত করতে হবে যাতে কোনো এয়ার পকেট বা হানিকম্ব না থাকে। অতিরিক্ত ভাইব্রেশন আবার ম্যাটেরিয়াল আলাদা করে ফেলে।',
      '৩. সঠিক কিউরিং (পানি দেওয়া): ঢালাইয়ের পরদিন থেকেই টানা ২৮ দিন পর্যাপ্ত পানি দিয়ে কিউরিং করুন। কিউরিং ঠিকমতো না হলে কংক্রিট তার শতভাগ শক্তি পায় না।',
      '৪. শাটারিং খোলার সময়: সাধারণ ছাদের শাটারিং কমপক্ষে ২১ থেকে ২৮ দিন পর খোলা উচিত। তাড়াহুড়ো করে শাটারিং সরালে ছাদে চির ধরার ঝুঁকি তৈরি হয়।',
    ],
  },
];

export function GuideScreen({
  openPremium,
  premium,
}: {
  openPremium(): void;
  premium: boolean;
}) {
  useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<GuideCategory>('all');
  const [activeArticle, setActiveArticle] = useState<GuideArticle | null>(null);

  const filteredArticles =
    selectedCategory === 'all'
      ? GUIDE_ARTICLES
      : GUIDE_ARTICLES.filter((a) => a.category === selectedCategory);

  return (
    <View style={styles.container}>
      {/* 1. TOP DARK HEADER (Matching Screenshot) */}
      <View style={styles.topHeader}>
        <Text style={styles.headerTitle}>নির্মাণ গাইড ও ব্যবহারবিধি</Text>
        <Text style={styles.headerSubtitle}>
          ইঞ্জিনিয়ারিং টিপস, খরচ কমানোর কৌশল ও ম্যাটেরিয়াল যাচাই গাইড
        </Text>
      </View>

      {/* 2. CATEGORY FILTER CHIPS ROW */}
      <View style={styles.filterWrap}>
        <ScrollView
          contentContainerStyle={styles.filterScroll}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <Pressable
            onPress={() => setSelectedCategory('all')}
            style={[
              styles.chip,
              selectedCategory === 'all' && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                selectedCategory === 'all' && styles.chipTextActive,
              ]}
            >
              সবগুলো
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedCategory('rules')}
            style={[
              styles.chip,
              selectedCategory === 'rules' && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                selectedCategory === 'rules' && styles.chipTextActive,
              ]}
            >
              ব্যবহারবিধি
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedCategory('tips')}
            style={[
              styles.chip,
              selectedCategory === 'tips' && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                selectedCategory === 'tips' && styles.chipTextActive,
              ]}
            >
              খরচ কমানোর টিপস
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedCategory('materials')}
            style={[
              styles.chip,
              selectedCategory === 'materials' && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                selectedCategory === 'materials' && styles.chipTextActive,
              ]}
            >
              ম্যাটেরিয়াল যাচাই
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* 3. GUIDE ARTICLES LIST */}
      <ScrollView
        contentContainerStyle={styles.scrollList}
        keyboardShouldPersistTaps="handled"
      >
        {filteredArticles.map((article) => {
          return (
            <View
              key={article.id}
              style={[
                styles.articleCard,
                article.highlighted && styles.articleCardHighlighted,
              ]}
            >
              {/* Card Top: Category Badge & Read Time */}
              <View style={styles.cardTopRow}>
                <View style={styles.badgeAmber}>
                  <Text style={styles.badgeAmberText}>
                    {article.categoryLabel}
                  </Text>
                </View>

                <Text style={styles.readTimeText}>{article.readTime}</Text>
              </View>

              {/* Title & Desc */}
              <Text style={styles.articleTitle}>{article.title}</Text>
              <Text style={styles.articleDesc}>{article.description}</Text>

              {/* Action Button: সম্পূর্ণ গাইড পড়ুন → */}
              <Pressable
                hitSlop={6}
                onPress={() => setActiveArticle(article)}
                style={styles.readMoreBtn}
              >
                <Text style={styles.readMoreBtnText}>সম্পূর্ণ গাইড পড়ুন →</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      {/* 4. ARTICLE READER MODAL */}
      <Modal
        animationType="slide"
        onRequestClose={() => setActiveArticle(null)}
        transparent
        visible={activeArticle !== null}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {activeArticle && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={styles.badgeAmber}>
                      <Text style={styles.badgeAmberText}>
                        {activeArticle.categoryLabel} • {activeArticle.readTime}
                      </Text>
                    </View>
                    <Text style={styles.modalTitle}>{activeArticle.title}</Text>
                  </View>
                  <Pressable
                    hitSlop={8}
                    onPress={() => setActiveArticle(null)}
                    style={styles.modalClose}
                  >
                    <Text style={styles.modalCloseText}>✕</Text>
                  </Pressable>
                </View>

                <ScrollView style={styles.modalScroll}>
                  <Text style={styles.modalIntroDesc}>
                    {activeArticle.description}
                  </Text>
                  <View style={styles.modalBullets}>
                    {activeArticle.content.map((point) => (
                      <View key={point} style={styles.pointRow}>
                        <Text style={styles.pointText}>{point}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>

                <Pressable
                  onPress={() => setActiveArticle(null)}
                  style={styles.closeBtn}
                >
                  <Text style={styles.closeBtnText}>বন্ধ করুন</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
    lineHeight: 16,
  },
  filterWrap: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 10,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollList: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  articleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 8,
  },
  articleCardHighlighted: {
    borderColor: '#F59E0B',
    borderWidth: 1.5,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeAmber: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  badgeAmberText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  readTimeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
  },
  articleDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  readMoreBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  readMoreBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 6,
    lineHeight: 22,
  },
  modalClose: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  modalScroll: {
    maxHeight: 380,
  },
  modalIntroDesc: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
    marginBottom: 14,
    lineHeight: 18,
  },
  modalBullets: {
    gap: 10,
  },
  pointRow: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pointText: {
    fontSize: 12,
    color: '#1E293B',
    lineHeight: 18,
  },
  closeBtn: {
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
});
