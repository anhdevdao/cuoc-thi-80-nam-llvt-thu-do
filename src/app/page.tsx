import RegistrationForm from "@/components/home/registration-form";

export default function Home() {
  const bannerImageUrl = process.env.BANNER_IMAGE_URL || "/file.svg";
  return <RegistrationForm bannerImageUrl={bannerImageUrl} />;
}
