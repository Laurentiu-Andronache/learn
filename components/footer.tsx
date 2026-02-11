import { getTranslations } from "next-intl/server";
import { CollapsibleFooter } from "@/components/collapsible-footer";

export async function Footer() {
  const tNav = await getTranslations("nav");
  const tFooter = await getTranslations("footer");

  return (
    <CollapsibleFooter
      tagline={tFooter("tagline")}
      aboutLabel={tNav("about")}
      showLabel={tFooter("showFooter")}
      hideLabel={tFooter("hideFooter")}
    />
  );
}
