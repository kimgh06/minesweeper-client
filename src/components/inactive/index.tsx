import S from './style.module.scss';

export default function Inactive({ time }: { time: number }) {
  return (
    <div className={S.inactive}>
      <div className={S.alert}>
        <p>You`re stunned!</p>
        <p>Try Again After</p>
        <p>
          {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}
        </p>
      </div>
    </div>
  );
}
