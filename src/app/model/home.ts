export interface Feature {
  icon: string;
  title: string;
  description: string;
  color: string;
  link: string;
}

export interface Testimonial {
  id: number;
  name: string;
  role: string;
  avatar: string;
  content: string;
  rating: number;
}

export interface Stat {
  value: string;
  label: string;
  icon: string;
}
