import Image from "next/image";
import AboutHeroInteractive from "./AboutHeroInteractive";

export default function AboutHero() {
  return (
    <section className="relative" aria-label="Band photo with interactive member hotspots">
      <Image
        src="/echo_blvd_headshot_full.png"
        alt="Echo Blvd band photo"
        width={1920}
        height={1080}
        className="w-full h-auto rounded-lg shadow-lg"
        priority
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1200px"
      />

      <AboutHeroInteractive />
    </section>
  );
}


