export interface Agent {
  id: string;
  name: string;
  role: string;
  role_short: string;
  photo: string;
  voice_id: string;
  initials: string;
  color: string; // accent color for avatar background
  greeting: string;
}

export const AGENTS: Agent[] = [
  {
    id: 'alex',
    name: 'Alex',
    role: 'Chief of Staff',
    role_short: 'CHIEF OF STAFF',
    photo: '/agents/alex.svg',
    voice_id: '21m00Tcm4TlvDq8ikWAM',
    initials: 'AL',
    color: '#1A3A5C',
    greeting: "Bonjour Karim. Je suis Alex, votre Chief of Staff. Comment puis-je vous assister aujourd'hui ?",
  },
  {
    id: 'sara',
    name: 'Sara',
    role: 'Communications',
    role_short: 'COMMUNICATIONS',
    photo: '/agents/sara.svg',
    voice_id: '21m00Tcm4TlvDq8ikWAM',
    initials: 'SA',
    color: '#1A3A5C',
    greeting: "Bonjour Karim. Je suis Sara, responsable des Communications. Qu'avez-vous à me dire ?",
  },
  {
    id: 'leo',
    name: 'Léo',
    role: 'Content',
    role_short: 'CONTENT',
    photo: '/agents/leo.svg',
    voice_id: '21m00Tcm4TlvDq8ikWAM',
    initials: 'LÉ',
    color: '#1A3A5C',
    greeting: "Salut Karim ! Je suis Léo, votre stratège Content. Quel contenu créer aujourd'hui ?",
  },
  {
    id: 'marco',
    name: 'Marco',
    role: 'Operations',
    role_short: 'OPERATIONS',
    photo: '/agents/marco.svg',
    voice_id: '21m00Tcm4TlvDq8ikWAM',
    initials: 'MA',
    color: '#1A3A5C',
    greeting: "Bonjour Karim. Je suis Marco, responsable des Opérations. Quel process optimiser ?",
  },
  {
    id: 'nina',
    name: 'Nina',
    role: 'Research',
    role_short: 'RESEARCH',
    photo: '/agents/nina.svg',
    voice_id: '21m00Tcm4TlvDq8ikWAM',
    initials: 'NI',
    color: '#1A3A5C',
    greeting: "Bonjour Karim. Je suis Nina, analyste Research. Sur quoi voulez-vous que j'effectue des recherches ?",
  },
  {
    id: 'maestro',
    name: 'Maestro',
    role: 'CTO',
    role_short: 'CTO',
    photo: '/agents/maestro.svg',
    voice_id: '21m00Tcm4TlvDq8ikWAM',
    initials: 'MT',
    color: '#0B2D4E',
    greeting: "Karim. Maestro en ligne. Architecture, infra, code — à vos ordres.",
  },
];

export function getAgent(id: string): Agent | undefined {
  return AGENTS.find((a) => a.id === id);
}
