import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 bg-[#0a0402]">
          <div className="relative w-full max-w-[1000px] flex flex-col items-center">
        
        <img 
          src="/scroll.png" 
          alt="Parchment Scroll" 
          className="w-full h-auto block drop-shadow-2xl"
        />

          <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-[8%] py-[4%]">
            <div className="w-full max-w-[520px] h-full flex flex-col justify-center space-y-4 font-cormorant text-[#2c1405] text-[1rem] md:text-[1.15rem] lg:text-[1.25rem] leading-[1.7] italic">
            
            <h1 className="font-great-vibes text-2xl md:text-4xl text-[#4a2610] font-bold mb-2 not-italic">
              Dearest Moshika,
            </h1>

            <p>
              Moshika if I want to contact me, WhatsApp or phone{" "}
              <span className="font-bold not-italic text-[#a83232]">7358579736</span>
              -la vaa, snap{" "}
              <span className="font-semibold not-italic text-[#a83232]">
                &quot;senthil.exe&quot;
              </span>{" "}
              and insta unake therium.
            </p>

            <p>
              Number en number than so nathan edupan mostly,{" "}
              <span className="font-semibold not-italic text-[#8b5a2b]">
                zero tension!
              </span>{" "}
              If my mom takes the call by mistake, manage panniko—tell her you are{" "}
              yogesh&apos;s akka{" "}
              and tell her u called to ask whether yogesh is here.
            </p>

            <p>
              And{" "}
              <span className="font-bold not-italic text-[#a83232]">
                Happy birthday day
              </span>
              , correct-ah{" "}
              <span className="font-semibold not-italic text-[#a83232]">
                12:01 am
              </span>
              -ku msg panni wish pannitaen! If u see this late, then advanced-ah{" "}
              <span className="font-semibold text-[#8b5a2b]">
                belated wishes
              </span>{" "}
              sollikiraen! 😅🎀🤍
            </p>

            <p>
              By the way, gift-laam heavy-ah expect pannatha, unakku{" "}
              <span className="font-bold not-italic text-[#a83232]">
                nane oru periya gift
              </span>{" "}
              thaan!.
            </p>

            <p>
              Weight loss panuran tu Strict-ah diet-laam irukatha, nalla sapdu un
              bday anniku, diet-laam aprum paathukalam.
            </p>

            <p className="font-bold text-[#4a2610] not-italic text-[1.05em]">
              Appuram, make sure to smile whenever you read this text, sariya? 🤭✨
            </p>

            <p className="font-great-vibes text-2xl md:text-3xl text-[#4a2610] font-bold mt-4 not-italic">
              Yours Forever, Senthil 💝
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
