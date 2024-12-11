import S from './style.module.scss';

export default function Inactive({ time }: { time: string }) {
  return (
    <div className={S.inactive}>
      <div className={S.alert}>
        <p>You`re stunned!</p>
        <p>Try Again After</p>
        <p>{time}</p>
      </div>
    </div>
  );
}
