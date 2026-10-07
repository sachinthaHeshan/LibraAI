export type PreferenceCategory = {
  id: string;
  label: string;
  tags: { id: string; label: string }[];
};

/** Tags members can pick on the reading-preferences screen. Tag ids are stored in member_preferences. */
export const PREFERENCE_CATALOG: PreferenceCategory[] = [
  {
    id: "genres",
    label: "Genres",
    tags: [
      { id: "fantasy", label: "Fantasy" },
      { id: "science-fiction", label: "Science fiction" },
      { id: "mystery-thriller", label: "Mystery & thriller" },
      { id: "romance", label: "Romance" },
      { id: "historical-fiction", label: "Historical fiction" },
      { id: "horror", label: "Horror" },
      { id: "literary-fiction", label: "Literary fiction" },
      { id: "classics", label: "Classics" },
      { id: "crime", label: "Crime" },
      { id: "adventure", label: "Adventure" },
      { id: "dystopian", label: "Dystopian" },
      { id: "contemporary-fiction", label: "Contemporary fiction" },
      { id: "magical-realism", label: "Magical realism" },
      { id: "paranormal", label: "Paranormal" },
      { id: "humor", label: "Humor" },
      { id: "poetry", label: "Poetry" },
      { id: "short-stories", label: "Short stories" },
      { id: "graphic-novels", label: "Graphic novels & comics" },
      { id: "drama-plays", label: "Drama & plays" },
      { id: "western", label: "Western" },
    ],
  },
  {
    id: "topics",
    label: "Non-fiction topics",
    tags: [
      { id: "biography-memoir", label: "Biography & memoir" },
      { id: "history", label: "History" },
      { id: "science", label: "Science" },
      { id: "technology", label: "Technology" },
      { id: "business", label: "Business" },
      { id: "self-help", label: "Self-help" },
      { id: "philosophy", label: "Philosophy" },
      { id: "travel", label: "Travel" },
      { id: "psychology", label: "Psychology" },
      { id: "health-wellness", label: "Health & wellness" },
      { id: "personal-finance", label: "Personal finance" },
      { id: "economics", label: "Economics" },
      { id: "politics", label: "Politics" },
      { id: "true-crime", label: "True crime" },
      { id: "nature-environment", label: "Nature & environment" },
      { id: "mathematics", label: "Mathematics" },
      { id: "art-design", label: "Art & design" },
      { id: "music", label: "Music" },
      { id: "cooking-food", label: "Cooking & food" },
      { id: "religion-spirituality", label: "Religion & spirituality" },
      { id: "education", label: "Education" },
      { id: "parenting-family", label: "Parenting & family" },
      { id: "sports", label: "Sports" },
      { id: "language-linguistics", label: "Language & linguistics" },
    ],
  },
  {
    id: "style",
    label: "Reading style",
    tags: [
      { id: "quick-reads", label: "Quick reads" },
      { id: "page-turners", label: "Page-turners" },
      { id: "series", label: "Book series" },
      { id: "award-winners", label: "Award winners" },
      { id: "young-adult", label: "Young adult" },
      { id: "childrens", label: "Children's books" },
      { id: "long-reads", label: "Long reads" },
      { id: "standalones", label: "Standalone novels" },
      { id: "bestsellers", label: "Bestsellers" },
      { id: "translated", label: "Translated works" },
      { id: "illustrated", label: "Illustrated books" },
      { id: "debut-authors", label: "Debut authors" },
    ],
  },
  {
    id: "moods",
    label: "Moods & themes",
    tags: [
      { id: "feel-good", label: "Feel-good" },
      { id: "funny", label: "Funny" },
      { id: "inspiring", label: "Inspiring" },
      { id: "cozy", label: "Cozy" },
      { id: "emotional", label: "Emotional" },
      { id: "thought-provoking", label: "Thought-provoking" },
      { id: "suspenseful", label: "Suspenseful" },
      { id: "dark-gritty", label: "Dark & gritty" },
      { id: "mind-bending", label: "Mind-bending" },
      { id: "romantic", label: "Romantic" },
      { id: "coming-of-age", label: "Coming of age" },
      { id: "found-family", label: "Found family" },
    ],
  },
  {
    id: "settings",
    label: "Settings & cultures",
    tags: [
      { id: "sri-lanka-south-asia", label: "Sri Lanka & South Asia" },
      { id: "asian-literature", label: "Asian literature" },
      { id: "african-literature", label: "African literature" },
      { id: "latin-american", label: "Latin American" },
      { id: "european", label: "European" },
      { id: "ancient-world", label: "Ancient world" },
      { id: "medieval", label: "Medieval" },
      { id: "world-wars", label: "World wars" },
      { id: "modern-day", label: "Modern day" },
      { id: "future-space", label: "Future & space" },
      { id: "small-town", label: "Small town" },
      { id: "big-city", label: "Big city" },
    ],
  },
];

const categoryByTag = new Map(
  PREFERENCE_CATALOG.flatMap((category) =>
    category.tags.map((tag) => [tag.id, category.id] as const),
  ),
);

export function preferenceCategoryOf(tag: string): string | undefined {
  return categoryByTag.get(tag);
}
