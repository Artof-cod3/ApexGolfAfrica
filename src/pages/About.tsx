import React from 'react';
import { Link } from 'react-router-dom';
import ClientHelpWidget from '../components/ClientHelpWidget';

const sections = [
  {
    title: 'Our Story',
    body:
      'ApexGolf Africa was founded on a simple observation: Kenya ranks among the top three golf tourism destinations in Africa, yet no professional caddie management company serves this booming market. Golfers visiting Karen, Muthaiga, and Vipingo deserve better than inconsistent service and untrained caddies. We built ApexGolf to fill that gap—bringing structure, training, and professionalism to an industry that has operated on luck for too long.',
  },
  {
    title: 'What We Do',
    body:
      "We are Africa's premier golf experience company. Through our four revenue streams—Professional Caddies, Premium Club Hire, Golf Photography, and Club Retainers—we deliver end-to-end service that transforms a regular round into an unforgettable experience. Every caddie graduates from the Apex Academy, trained in rules, etiquette, and service excellence. Golfers know exactly what to expect: uniformed, certified, reliable professionals on every round.",
  },
  {
    title: 'The Apex Difference',
    body:
      'Details matter. Our signature touches set us apart. The Apex Cool Box keeps golfers refreshed with branded water and local snacks—macadamia, mango, Kenyan crisps—while doubling as a walking billboard across the course. The Apex Finish Pack, presented on the 18th hole, turns a Ksh 120 investment into Ksh 10,000 of referral value through memorable farewells. And our custom Yardage Books give golfers tour-level preparation with hole diagrams, green layouts, and insider tips they keep as souvenirs. These touches cost us just 13% of our fee. They generate tenfold returns in loyalty and repeat bookings.',
  },
  {
    title: 'Why We Win',
    body:
      'We are first movers in an uncontested market. Our model scales—from one club to ten across East Africa. Our revenue streams diversify risk from day one. And we create dignified, well-paying jobs for Africans, with every caddie serving as an ambassador for excellence. We are actively seeking pilot club partners, investors, and tour operator alliances to bring ApexGolf to courses across the continent.',
  },
];

const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#faf8f5] px-4 py-6 md:px-6 md:py-8">
      <header className="sticky top-4 z-40 mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/60 bg-white/85 px-5 py-3 shadow-lg backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1c2b24] text-[#c9a962] shadow-md">⛳</div>
          <span className="font-serif text-xl font-bold text-[#1c2b24]">ApexGolf</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <Link to="/" className="rounded-full border border-gray-200 px-4 py-2 text-[#1c2b24] transition hover:bg-[#1c2b24] hover:text-white">
            Book
          </Link>
          <Link to="/client" className="rounded-full border border-gray-200 px-4 py-2 text-[#1c2b24] transition hover:bg-[#1c2b24] hover:text-white">
            Find Booking
          </Link>
          <Link to="/help" className="rounded-full border border-gray-200 px-4 py-2 text-[#1c2b24] transition hover:bg-[#1c2b24] hover:text-white">
            Help
          </Link>
        </div>
      </header>

      <main className="mx-auto mt-6 max-w-6xl">
        <section className="relative overflow-hidden rounded-4xl px-8 py-14 text-white shadow-2xl md:px-12 md:py-20" style={{ background: 'linear-gradient(135deg, rgba(28,43,36,0.96) 0%, rgba(45,74,62,0.88) 100%)' }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,169,98,0.22),transparent_40%)]" />
          <div className="relative max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-[#c9a962]">About ApexGolf Africa</p>
            <h1 className="font-serif text-4xl font-bold leading-tight md:text-6xl">
              Building the <span className="italic text-[#e5d4a1]">future</span> of golf experiences in Africa.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-gray-200 md:text-lg">
              Professional caddies, elevated course hospitality, and a guest journey designed to make every round memorable.
            </p>
          </div>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          {sections.map((section, index) => (
            <article
              key={section.title}
              className={`rounded-[28px] border border-[#e9dfca] bg-white p-8 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${index === sections.length - 1 ? 'md:col-span-2' : ''}`}
            >
              <h2 className="font-serif text-3xl font-bold text-[#1c2b24]">{section.title}</h2>
              <p className="mt-4 text-base leading-8 text-gray-600">{section.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-[28px] border border-[#e9dfca] bg-[linear-gradient(135deg,#f5f3ef_0%,#ede8e0_100%)] p-8 shadow-sm md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#8b7a4f]">Ready to experience Apex?</p>
              <h2 className="mt-2 font-serif text-3xl font-bold text-[#1c2b24]">Book your round or speak to the team.</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/" className="rounded-full bg-[#1c2b24] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#2d4a3e]">
                Book Now
              </Link>
              <Link to="/help" className="rounded-full border border-[#c9a962] px-6 py-3 text-sm font-semibold text-[#1c2b24] transition hover:bg-white">
                Contact Support
              </Link>
            </div>
          </div>
        </section>
      </main>

      <ClientHelpWidget />
    </div>
  );
};

export default About;
