import { report } from '../../fixtures/reportFile'
import styles from './ReportPage.module.css'

/**
 * The page of the HTML report of the context folder, as a browser draws
 * it: its heading, its lines, and the bars that its script draws, one for
 * each length of query. The file sets 1 px of bar for each ms at a text
 * size of 15 px, so a bar is `ms / 15` em long here.
 */
export function ReportPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{report.title}</h1>
      <p className={styles.meta}>{report.date}</p>
      <p className={styles.text}>{report.summary.join(' ')}</p>
      <h2 className={styles.heading}>{report.chartTitle}</h2>
      <div className={styles.chart}>
        {report.times.map((time) => (
          <div className={styles.row} key={time.label}>
            <span className={styles.label}>{time.label}</span>
            <span
              className={styles.bar}
              style={{ width: `${time.ms / 15}em` }}
            />
            <span className={styles.value}>{time.ms} ms</span>
          </div>
        ))}
      </div>
      <p className={styles.note}>{report.note}</p>
    </div>
  )
}
