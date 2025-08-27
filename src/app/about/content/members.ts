export type MemberId = "jeremy" | "tom" | "zac" | "scott";

export type MemberMeta = {
  id: MemberId;
  name: string;
  role: string;
  portraitSrcs: string[];
  bioHtml: string;
};

export type Hotspot = {
  memberId: MemberId;
  xPercent: number; // 0..100
  yPercent: number; // 0..100
  radiusPercent: number; // hit area size
  ariaLabel: string;
};

export const members: MemberMeta[] = [
  {
    id: "jeremy",
    name: "Jeremy",
    role: "Bass",
    portraitSrcs: ["/Jeremy 01.jpeg", "/Jeremy 02.JPG", "/Jeremy 03.JPG"],
    bioHtml: `
      <p>Jeremy is a bassist with over three decades of playing and performing experience, now bringing the low end to Echo Blvd. His musical path started at 14, playing in garage bands and evolving to bigger stages with acts like The Honored Guests, a Chapel Hill indie band with an experimental edge. Over the years, he has played everything from stripped-down acoustic sets to layered, high-energy rock shows, always chasing the right balance of groove, tone, and connection with the audience.</p>
      <p>His style is shaped by the raw drive of 90s grunge, the texture and mood of alternative rock, and the solid backbone of classic rock. Bands like Smashing Pumpkins, Pearl Jam, and Foo Fighters have all left their mark on his approach, along with the melodic inventiveness of Radiohead and the rhythmic punch of bassists like Robert Sledge, Carlos D, and Flea. He’s drawn to music with depth, whether it’s the atmospheric layers of Doves, the soulful grit of My Morning Jacket, or the post-punk edge of Interpol, and he brings those influences into his playing.</p>
      <p>For Jeremy, being in a band is about more than playing notes. It’s about building something together, creating a sound that hits both head and heart. Echo Blvd is a chance to do that with great people, great songs, and the kind of live energy that makes every show different from the last.</p>
    `,
  },
  {
    id: "tom",
    name: "Tom",
    role: "Lead Guitar",
    portraitSrcs: ["/portraits/tom.jpg"],
    bioHtml: `
      <h2>Tom</h2>
      <p>Tom&rsquo;s guitar work blends wide-screen textures with precise leads, channeling classic influences through a modern alt-rock lens.</p>
      <p>In the studio he layers tasteful parts that elevate the songs; on stage he brings dynamics and fire without losing the melody.</p>
    `,
  },
  {
    id: "zac",
    name: "Zac Fermanis",
    role: "Vocals, Rhythm Guitar, Keyboard",
    portraitSrcs: ["/portraits/zac.jpg"],
    bioHtml: `
      <h2>Zac Fermanis</h2>
      <p>Zac fronts Echo Blvd with raw, honest vocals and rhythm guitar that keeps the songs surging forward. His lyrics lean into catharsis&mdash;earnest, immediate, and built to connect.</p>
      <p>At the keys or on guitar, he shapes the band&rsquo;s hooks and arrangements while keeping the live show tight and electric.</p>
    `,
  },
  {
    id: "scott",
    name: "Scott",
    role: "Drums",
    portraitSrcs: ["/portraits/scott.jpg"],
    bioHtml: `
      <h2>Scott</h2>
      <p>Scott drives the band with propulsive drums&mdash;tight grooves, dynamic builds, and a deep pocket that keeps crowds moving.</p>
      <p>He brings both power and restraint, shaping arrangements with musical choices that serve the song and the moment.</p>
    `,
  },
];

export const hotspots: Hotspot[] = [
  { memberId: "jeremy", xPercent: 18, yPercent: 42, radiusPercent: 7, ariaLabel: "Open bio for Jeremy, Bass" },
  { memberId: "tom", xPercent: 38, yPercent: 40, radiusPercent: 7, ariaLabel: "Open bio for Tom, Lead Guitar" },
  { memberId: "zac", xPercent: 60, yPercent: 39, radiusPercent: 7, ariaLabel: "Open bio for Zac, Vocals, Rhythm Guitar, Keyboard" },
  { memberId: "scott", xPercent: 80, yPercent: 41, radiusPercent: 7, ariaLabel: "Open bio for Scott, Drums" },
];


