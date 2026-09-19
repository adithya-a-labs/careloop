import { CalendarDays, Camera, Check, ChevronRight, Clock3, Heart, Mic, Plus, ShieldCheck, Sparkles, Sun, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SAFETY_NOTICE } from '@careloop/shared';

const Screen = ({ eyebrow, title, copy, children }: React.PropsWithChildren<{ eyebrow: string; title: string; copy: string }>) => <div className="screen">
  <p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="lede">{copy}</p>{children}
</div>;
const Tile = ({ icon, title, copy, to = '#' }: { icon: React.ReactNode; title: string; copy: string; to?: string }) => <Link className="tile" to={to}>{icon}<span><strong>{title}</strong><small>{copy}</small></span><ChevronRight /></Link>;

export function WelcomePage() { return <main className="welcome"><div className="sun-orbit"><Heart /></div><p className="eyebrow">Care, connected</p><h1>Family care feels lighter when everyone is in the loop.</h1><p>One warm place for check-ins, tasks, memories and everyday support.</p><div className="button-row"><Link className="primary-button" to="/create-circle">Create a family group</Link><Link className="secondary-button" to="/join-circle">Join with a code</Link></div><small className="safety"><ShieldCheck size={16} /> {SAFETY_NOTICE}</small></main>; }
export function CreateCirclePage() { return <Screen eyebrow="Start together" title="Create your Care Circle" copy="Give your family group a familiar name."><form className="form-card"><label>Circle name<input placeholder="e.g. Amma's care circle" /></label><label>Your role<select><option>Family member</option><option>Care recipient</option><option>Coordinator</option></select></label><Link className="primary-button" to="/profile">Continue</Link></form></Screen>; }
export function JoinCirclePage() { return <Screen eyebrow="You’re invited" title="Join your family group" copy="Enter the six-character code shared by your family."><form className="form-card"><label>Invite code<input className="code-input" placeholder="CARE42" maxLength={6} /></label><Link className="primary-button" to="/profile">Join circle</Link></form></Screen>; }
export function ProfileSetupPage() { return <Screen eyebrow="A little about you" title="Make this space yours" copy="Your family will see this name and photo."><form className="form-card"><button className="avatar-picker" type="button"><Camera /> Add photo</button><label>Preferred name<input placeholder="How should we greet you?" /></label><Link className="primary-button" to="/preferences">Next</Link></form></Screen>; }
export function AgePreferencesPage() { return <Screen eyebrow="Comfort first" title="Set your preferences" copy="Choose the experience that feels easiest to use."><div className="form-card"><label>Age range<select><option>Under 18</option><option>18–64</option><option>65+</option></select></label><label className="check-row"><input type="checkbox" defaultChecked /> Larger text and controls</label><label className="check-row"><input type="checkbox" defaultChecked /> Voice-first shortcuts</label><Link className="primary-button" to="/home">Finish setup</Link></div></Screen>; }

export { PatientHomePage } from './PatientHome';
export { FamilyHomePage } from './FamilyHome';
export { VoicePage } from './VoicePage';
export { TasksPage } from './TasksPage';
export { TimelinePage } from './TimelinePage';
export { MemoryBoxPage } from './MemoryBoxPage';
export { CareCirclePage } from './CareCirclePage';
export function HealthWellbeingPage() { return <Screen eyebrow="Gentle check-in" title="How are you feeling today?" copy="This helps your family notice patterns. It is not a medical assessment."><div className="moods"><button>😊<span>Good</span></button><button>🙂<span>Okay</span></button><button>😕<span>Low</span></button><button>😣<span>Unwell</span></button></div><textarea rows={4} placeholder="Anything you want to add?" /><button className="primary-button">Share check-in</button></Screen>; }
export function SettingsPage() { return <Screen eyebrow="Your space" title="Settings" copy="Control notifications, accessibility and privacy."><div className="list"><Tile icon={<Users />} title="Circle permissions" copy="Choose who can see what" /><Tile icon={<Check />} title="Notifications" copy="Daily digest and urgent updates" /><Tile icon={<ShieldCheck />} title="Privacy & safety" copy="Data controls and boundaries" /></div></Screen>; }
