// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_initial_schema.sql';
import m0001 from './0001_fase3_core.sql';
import m0002 from './0002_initial_streak_days.sql';
import m0003 from './0003_check_in_previous_answer.sql';
import m0004 from './0004_fase4_monitoring.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004
    }
  }
  