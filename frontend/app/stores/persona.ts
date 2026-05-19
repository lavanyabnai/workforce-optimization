import { create } from "zustand";

export type PersonaId = "carla" | "marco" | "lin";

export type Persona = {
  id: PersonaId;
  name: string;
  role: string;
  initials: string;
  color: string;        // CSS color for avatar background
  textColor: string;    // CSS color for avatar text
};

export const PERSONAS: Persona[] = [
  { id: "carla", name: "Carla K.", role: "Labor Planner",   initials: "CK", color: "var(--c-signal)",  textColor: "var(--c-ink)" },
  { id: "marco", name: "Marco R.", role: "Regional Manager", initials: "MR", color: "var(--c-orange)",  textColor: "var(--c-white)" },
  { id: "lin",   name: "Lin T.",   role: "Finance Analyst",  initials: "LT", color: "var(--c-grape)",   textColor: "var(--c-white)" },
];

type PersonaStore = {
  persona: Persona;
  setPersona: (id: PersonaId) => void;
};

export const usePersonaStore = create<PersonaStore>((set) => ({
  persona: PERSONAS[0],
  setPersona: (id) =>
    set({ persona: PERSONAS.find((p) => p.id === id)! }),
}));
