/**
 * Shape of one search document in the generated corpus.
 * Kept separate so the generated array stays plain JSON.
 */
export interface CorpusEntry {
  id: string;
  kind: "kingdom" | "advisor" | "era" | "technique" | "dilemma" | "experiment" | "glossary" | "text";
  title: string;
  href: string;
  year: number | null;
  body: string;
  tags: string[];
}
