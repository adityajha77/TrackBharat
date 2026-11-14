// Static content lives in data files, not inside components. Phase 4 moves this
// into the database so it can be translated (Hindi + regional languages).
export interface Right {
  id: string;
  title: string;
  summary: string;
  category: "Democratic" | "Transparency" | "Social" | "Economic";
  details: string;
  references: string[];
}

export const rights: Right[] = [
  {
    id: "vote",
    title: "Right to vote",
    summary: "Every citizen aged 18 or above can vote in elections.",
    category: "Democratic",
    details:
      "Adult suffrage is guaranteed by the Constitution. Every citizen who is 18 or older on the qualifying date and is enrolled on the electoral roll can vote to choose their representatives.",
    references: ["Article 326", "Representation of the People Act, 1951"],
  },
  {
    id: "rti",
    title: "Right to information",
    summary: "Ask any public authority for information it holds.",
    category: "Transparency",
    details:
      "The RTI Act lets any citizen request information from public authorities, which must generally reply within 30 days. It is the most powerful tool a citizen has to verify a government claim.",
    references: ["RTI Act, 2005", "Article 19(1)(a)"],
  },
  {
    id: "education",
    title: "Right to education",
    summary: "Free and compulsory education for children aged 6–14.",
    category: "Social",
    details: "Article 21A makes free and compulsory elementary education a fundamental right for every child aged 6 to 14.",
    references: ["Article 21A", "RTE Act, 2009"],
  },
  {
    id: "work",
    title: "Right to work",
    summary: "100 days of guaranteed wage employment for rural households.",
    category: "Economic",
    details:
      "Under MGNREGA, every rural household whose adult members volunteer for unskilled manual work is entitled to at least 100 days of wage employment in a financial year.",
    references: ["MGNREGA, 2005", "Article 41"],
  },
  {
    id: "food",
    title: "Right to food",
    summary: "Subsidised food grains for eligible households.",
    category: "Social",
    details:
      "The National Food Security Act provides subsidised food grains to eligible households through the Public Distribution System.",
    references: ["National Food Security Act, 2013", "Article 21"],
  },
  {
    id: "health",
    title: "Right to health",
    summary: "Recognised by courts as part of the right to life.",
    category: "Social",
    details:
      "Not written explicitly in the Constitution, but the Supreme Court has read the right to health into Article 21 (right to life). Schemes like Ayushman Bharat provide access to care.",
    references: ["Article 21", "Ayushman Bharat PM-JAY"],
  },
];

export const categories = ["All", "Democratic", "Transparency", "Social", "Economic"] as const;
