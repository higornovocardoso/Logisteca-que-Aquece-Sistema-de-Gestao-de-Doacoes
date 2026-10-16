import logoSenai from '../assets/senai.svg';

/** Logo oficial do SENAI (bloco vermelho com o nome), na proporção original. */
export function LogoSenai({ className = 'h-7' }: { className?: string }) {
  return <img src={logoSenai} alt="SENAI" className={`w-auto ${className}`} draggable={false} />;
}
