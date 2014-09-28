package hu.nevermind.piggyhtml;

import java.io.BufferedReader;
import java.io.IOException;

import java.io.InputStreamReader;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.StringTokenizer;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.eclipse.jetty.server.Handler;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.handler.DefaultHandler;
import org.eclipse.jetty.server.handler.HandlerList;
import org.eclipse.jetty.server.handler.ResourceHandler;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;
import org.json.JSONObject;
import org.postgresql.ds.PGPoolingDataSource;

@WebServlet(value = "/*", asyncSupported = true, urlPatterns = {"/budget.html"})
public class Main extends HttpServlet {

	public static final String USERNAME_ATTR_NAME = "username";
	private PGPoolingDataSource dataSource;

	@Override
	public void init() throws ServletException {
		try {
			dataSource = createDataSource();
		} catch (final SQLException e) {
			throw new RuntimeException(e);
		}
	}

	@Override
	protected void doPost(final HttpServletRequest req, final HttpServletResponse resp) throws ServletException, IOException {
		// 1. get received JSON data from request
		final BufferedReader br = new BufferedReader(new InputStreamReader(req.getInputStream()));
		final JSONObject request = new JSONObject(br.readLine());

		final boolean notLoggedIn = req.getSession(false) == null || req.getSession(false).getAttribute(USERNAME_ATTR_NAME) == null;
		final boolean requestContainsUsername = request.optString(USERNAME_ATTR_NAME, null) != null;
		if (notLoggedIn) {
			if (!requestContainsUsername) {
				resp.getWriter().write("{\"mustLogin\": \"true\"}");
				return;
			}
			final String username = request.getString(USERNAME_ATTR_NAME);
			req.getSession(true).setAttribute(USERNAME_ATTR_NAME, username);
		}

		if ("init".equals(request.getString("command"))) {
			try {
				final String username = (String) req.getSession().getAttribute(USERNAME_ATTR_NAME);
				try (final Connection conn = dataSource.getConnection()) {
					final Statement statement = conn.createStatement();
					final JSONObject responseJson = new JSONObject();
					responseJson.put("perselyek", createPerselyekJson(statement, username));
					responseJson.put("budget_entries", createBudgetEntriesJson(statement, username));
					responseJson.put("transactions", createTxJson(statement, username));
					responseJson.put("places", createPlacesJson(statement, username));
					responseJson.put("username", username);
					resp.setContentType("text/html;charset=utf-8");
					resp.getWriter().write(responseJson.toString());
					return;
				}
			} catch (final SQLException e) {
				throw new RuntimeException(e);
			}
		}
		final String username = (String) req.getSession().getAttribute(USERNAME_ATTR_NAME);
		final String result = process(req, request, username, request.getString("command"));
		resp.getWriter().write(result);
	}

	private String process(final HttpServletRequest req, final JSONObject request, final String username, final String command) throws IOException {
		if ("updatePersely".equals(command)) {
			updatePersely(request, username);
		} else if ("updateBudgetEntry".equals(request.getString("command"))) {
			updateBudgetEntry(request, username);
		} else if ("updateTransaction".equals(request.getString("command"))) {
			updateTx(request, username);
		} else if ("addPlace".equals(request.getString("command"))) {
			final long newId = insertPlace(request, username);
			return "{\"id\":" + newId + "}";
		} else if ("deletePlace".equals(request.getString("command"))) {
			final int id = request.getInt("place_id");
			delete("place", id, username);
		} else if ("addPersely".equals(request.getString("command"))) {
			final long newId = insertPersely(request, username);
			return "{\"id\":" + newId + "}";
		} else if ("addBudgetEntry".equals(request.getString("command"))) {
			final long newId = insertBudgetEntry(request, username);
			return "{\"id\":" + newId + "}";
		} else if ("addTransaction".equals(request.getString("command"))) {
			final long newId = insertTx(request, username);
			return "{\"id\":" + newId + "}";
		} else if ("deletePersely".equals(request.getString("command"))) {
			final int id = request.getInt("persely_id");
			delete("persely", id, username);
		} else if ("deleteBudgetEntry".equals(request.getString("command"))) {
			final int id = request.getInt("budget_entry_id");
			delete("budget_entry", id, username);
		} else if ("deleteTransaction".equals(request.getString("command"))) {
			final int id = request.getInt("tx_id");
			delete("money_tx", id, username);
		} else if ("ping".equals(request.getString("command"))) {
		} else if ("logout".equals(request.getString("command"))) {
			req.getSession().invalidate();
		}
		return "{}"; 
	}

	private void updatePersely(final JSONObject request, final String username) {
		final JSONObject persely = request.getJSONObject("persely");
		final int id = persely.getInt("id");
		final String perselyName = persely.getString("name");
		final String placeName = persely.getString("place_name");
		final String imgLink = persely.getString("img_link");
		final int goalValue = persely.getInt("goal_value");
		update("persely", id, username, "name", perselyName, "place", placeName, "goal_value", goalValue, "img_link", imgLink);
	}

	private void updateBudgetEntry(final JSONObject request, final String username) {
		final JSONObject budgetEntry = request.getJSONObject("budget_entry");
		final int id = budgetEntry.getInt("id");
		final String budgetedTo = budgetEntry.getString("budgeted_to");
		final int budgeted = budgetEntry.getInt("budgeted");
		final int planningType = budgetEntry.getInt("planning_type");
		final boolean isAllando = budgetEntry.getBoolean("is_allando");
		update("budget_entry", id, username, "budgeted_to", budgetedTo, "budgeted", budgeted, "is_allando", isAllando, "planning_type", planningType == 0 ? "Expense" : "Save");
	}

	private void updateTx(final JSONObject request, final String username) {
		final JSONObject tx = request.getJSONObject("transaction");
		final int id = tx.getInt("id");
		final String src = tx.optString("src", null);
		final String dst = tx.getString("dst");
		final String descr = tx.optString("descr");
		final int txType = tx.getInt("tx_type");
		final String dateStr = tx.getString("dateStr");
		final int year = Integer.parseInt(dateStr.split("-")[0]);
		final int month = Integer.parseInt(dateStr.split("-")[1]);
		final int day = Integer.parseInt(dateStr.split("-")[2]);
		final int value = tx.getInt("value");
		update("money_tx", id, username, "src", src, "dst", dst, "descr", descr, "tx_type", getTransactionType(txType), "year", year, "month", month, "day", day,
				"value", value);
	}

	private long insertPersely(final JSONObject request, final String username) {
		final JSONObject persely = request.getJSONObject("persely");
		final String perselyName = persely.getString("name");
		final String place = persely.getString("place_name");
		final String imgLink = persely.getString("img_link");
		final int goalValue = persely.getInt("goal_value");
		return insert("persely", username, "name", perselyName, "place", place, "goal_value", goalValue, "img_link", imgLink);
	}

	private long insertPlace(final JSONObject request, final String username) {
		final JSONObject place = request.getJSONObject("place");
		final String placeName = place.getString("name");
		return insert("place", username, "name", placeName);
	}

	private void updatePlace(final JSONObject request, final String username) {
		final JSONObject place = request.getJSONObject("place");
		final int id = place.getInt("id");
		final String placeName = place.getString("name");
		update("place", id, username, "name", placeName);
	}

	private long insertTx(final JSONObject request, final String username) {
		final JSONObject tx = request.getJSONObject("transaction");
		final String src = tx.optString("src");
		final String dst = tx.getString("dst");
		final String descr = tx.optString("descr");
		final int txType = tx.getInt("tx_type");
		final String dateStr = tx.getString("dateStr");
		final int year = Integer.parseInt(dateStr.split("-")[0]);
		final int month = Integer.parseInt(dateStr.split("-")[1]);
		final int day = Integer.parseInt(dateStr.split("-")[2]);
		final int value = tx.getInt("value");
		return insert( "money_tx", username, "src", src, "dst", dst, "descr", descr, "tx_type", getTransactionType(txType), "year", year, "month", month, "day", day,
				"value", value);
	}

	private long insertBudgetEntry(final JSONObject request, final String username) {
		final JSONObject budgetEntry = request.getJSONObject("budget_entry");
		final String budgetedTo = budgetEntry.getString("budgeted_to");
		final int budgeted = budgetEntry.getInt("budgeted");
		final int planningType = budgetEntry.getInt("planning_type");
		final int year = budgetEntry.getInt("year");
		final int month = budgetEntry.getInt("month");
		final boolean isAllando = budgetEntry.getBoolean("is_allando");
		return insert("budget_entry", username, "is_allando", isAllando, "year", year, "month", month, "budgeted_to", budgetedTo, "budgeted", budgeted, "planning_type",
				planningType == 0 ? "Expense" : "Save");
	}

	private String getTransactionType(final int txType) {
		switch (txType) {
			case 0:
				return "Spending";
			case 1:
				return "Flagging";
			default:
				return "IgnoreInBudgetFlagging";
		}
	}

	private void update(final String tableName, final int id, final String username, final Object... args) {
		final List<String> columnNames = new ArrayList<>();
		final List<Object> columnValue = new ArrayList<>();
		boolean first = true;
		for (final Object arg : args) {
			if (first == true) {
				columnNames.add((String) arg);
				first = false;
			} else {
				columnValue.add(arg);
				first = true;
			}
		}
		String updateSql = "UPDATE " + tableName + " SET ";
		for (final String columnName : columnNames) {
			updateSql += columnName + " = ?, ";
		}
		updateSql = updateSql.substring(0, updateSql.length() - 2);
		updateSql += " WHERE id = ? AND user_name = ? ";
		try (final Connection conn = dataSource.getConnection()) {
			final PreparedStatement stmt = conn.prepareStatement(updateSql);
			int paramIndex = 1;
			for (final Object o : columnValue) {
				if (o instanceof Integer) {
					stmt.setInt(paramIndex, (Integer) o);
				} else if (o instanceof Boolean) {
					stmt.setBoolean(paramIndex, (Boolean) o);
				} else {
					stmt.setString(paramIndex, (String) o);
				}
				++paramIndex;
			}
			stmt.setInt(paramIndex++, id);
			stmt.setString(paramIndex, username);
			stmt.execute();

		} catch (final SQLException e) {
			throw new RuntimeException(e);
		}
	}

	private int insert(final String tableName, final String username, final Object... args) {
		final List<String> columnNames = new ArrayList<>();
		final List<Object> columnValue = new ArrayList<>();
		boolean first = true;
		for (final Object arg : args) {
			if (first == true) {
				columnNames.add((String) arg);
				first = false;
			} else {
				columnValue.add(arg);
				first = true;
			}
		}
		String insertSql = "INSERT INTO " + tableName + " (";
		for (final String columnName : columnNames) {
			insertSql += columnName + ", ";
		}
		insertSql += " id, user_name) VALUES (";
		for (final String columnName : columnNames) {
			insertSql += "?, ";
		}

		insertSql += "?, ? )";
		try (final Connection conn = dataSource.getConnection()) {
			final PreparedStatement stmt = conn.prepareStatement(insertSql);
			int paramIndex = 1;
			for (final Object o : columnValue) {
				if (o instanceof Integer) {
					stmt.setInt(paramIndex, (Integer) o);
				} else if (o instanceof Boolean) {
					stmt.setBoolean(paramIndex, (Boolean) o);
				} else {
					stmt.setString(paramIndex, (String) o);
				}
				++paramIndex;
			}
			final int id = seqNextVal();
			stmt.setInt(paramIndex++, id);
			stmt.setString(paramIndex, username);
			stmt.execute();
			return id;
		} catch (final SQLException e) {
			throw new RuntimeException(e);
		}
	}

	private int seqNextVal() throws SQLException {
		try (final Connection conn = dataSource.getConnection()) {
			final PreparedStatement stmt = conn.prepareStatement("SELECT nextval('seq')");
			final ResultSet resultSet = stmt.executeQuery();
			resultSet.next();
			return resultSet.getInt(1);
		}
	}

	private void delete(final String tableName, final int id, final String username) {
		try (final Connection conn = dataSource.getConnection()) {
			final PreparedStatement stmt = conn.prepareStatement("DELETE FROM " + tableName + " WHERE id = ? AND user_name = ?");
			stmt.setInt(1, id);
			stmt.setString(2, username);
			stmt.execute();
		} catch (final SQLException e) {
			throw new RuntimeException(e);
		}
	}

	private PGPoolingDataSource createDataSource() throws SQLException {
		final String databaseUrl = System.getenv("DATABASE_URL");
		final StringTokenizer st = new StringTokenizer(databaseUrl, ":@/");
		final String dbVendor = st.nextToken();
		final String userName = st.nextToken();
		final String password = st.nextToken();
		final String host = st.nextToken();
		final String port = st.nextToken();
		final String databaseName = st.nextToken();

		final PGPoolingDataSource dataSource = new PGPoolingDataSource();
		dataSource.setDataSourceName("A Data Source");
		dataSource.setServerName(host);
		dataSource.setDatabaseName(databaseName);
		dataSource.setUser(userName);
		dataSource.setPassword(password);
		dataSource.setMaxConnections(10);
		dataSource.setSsl(true);
		dataSource.setSslfactory("org.postgresql.ssl.NonValidatingFactory");
		// vendor:hbtqticiuqzvxh:UxJF35D3YIRxE82f8IrS78Y8n1:ec2-54-197-241-78.compute-1.amazonaws.com:5432:d1vlno7mg4d64l
		//val jdbcUrl = java.lang.String.format("jdbc:postgresql://%s:%s/%s?ssl=true&sslfactory=org.postgresql.ssl.NonValidatingFactory", host, port, databaseName)
		/*final String jdbcUrl = String.format("jdbc:postgresql://%s:%s/%s?user=%s&password=%s&ssl=true&sslfactory=org.postgresql.ssl.NonValidatingFactory",
				host, port, databaseName, userName, password);
		conn = DriverManager.getConnection(jdbcUrl);*/
		return dataSource;
	}

	private List<JSONObject> createPlacesJson(final Statement statement, final String name) throws SQLException {
		final ResultSet rs = statement.executeQuery("SELECT id, name FROM place WHERE user_name = '" + name + "'");
		final List<JSONObject> placesList = new ArrayList<>();

		while (rs.next()) {
			final JSONObject obj = new JSONObject();
			obj.put("id", rs.getLong("id"));
			obj.put("name", rs.getString("name"));

			placesList.add(obj);
		}
		return placesList;
	}

	private List<JSONObject> createBudgetEntriesJson(final Statement statement, final String name) throws SQLException {
		final ResultSet rs = statement.executeQuery("SELECT id, budgeted, month, planning_type, year, budgeted_to, is_allando FROM budget_entry WHERE user_name = '" + name + "'");
		final List<JSONObject> budgetEntryList = new ArrayList<>();

		while (rs.next()) {
			final JSONObject obj = new JSONObject();
			obj.put("id", rs.getLong("id"));
			obj.put("budgeted", rs.getInt("budgeted"));
			obj.put("year", rs.getInt("year"));
			obj.put("month", rs.getInt("month"));
			obj.put("planning_type", rs.getString("planning_type"));
			obj.put("budgeted_to", rs.getString("budgeted_to"));
			obj.put("is_allando", rs.getBoolean("is_allando"));

			budgetEntryList.add(obj);
		}
		return budgetEntryList;
	}

	private List<JSONObject> createPerselyekJson(final Statement statement, final String name) throws SQLException {
		final ResultSet rs = statement.executeQuery("SELECT id, name, place, goal_value, img_link FROM persely WHERE user_name = '" + name + "'");
		final List<JSONObject> perselyekList = new ArrayList<>();

		while (rs.next()) {
			final JSONObject obj = new JSONObject();
			obj.put("id", rs.getLong("id"));
			obj.put("name", rs.getString("name"));
			obj.put("place", rs.getString("place"));
			obj.put("goal_value", rs.getInt("goal_value"));
			obj.put("img_link", rs.getString("img_link"));
			perselyekList.add(obj);
		}
		return perselyekList;
	}

	private List<JSONObject> createTxJson(final Statement statement, final String name) throws SQLException {
		final ResultSet rs = statement.executeQuery("SELECT id, src, dst, descr, tx_type, year, month, day, value FROM money_tx WHERE user_name = '" + name + "'");
		final List<JSONObject> txList = new ArrayList<>();

		while (rs.next()) {
			final JSONObject obj = new JSONObject();
			obj.put("id", rs.getLong("id"));
			obj.put("src", rs.getString("src"));
			obj.put("dst", rs.getString("dst"));
			obj.put("descr", rs.getString("descr"));
			obj.put("tx_type", rs.getString("tx_type"));
			obj.put("year", rs.getInt("year"));
			obj.put("month", rs.getInt("month"));
			obj.put("day", rs.getInt("day"));
			obj.put("value", rs.getInt("value"));
			txList.add(obj);
		}
		return txList;
	}

	public static void main(final String[] args) throws Exception {
		startJetty(args);
	}

	public static void startJetty(final String[] args) throws Exception {
		final Server server = new Server(Integer.valueOf(System.getenv("PORT")));

		final ServletContextHandler servletContextHandler = new ServletContextHandler(ServletContextHandler.SESSIONS);
		servletContextHandler.setContextPath("/");
		server.setHandler(servletContextHandler);
		servletContextHandler.addServlet(new ServletHolder(new Main()), "/*");
		servletContextHandler.addFilter(CorsFilter.class, "/", 1);

		final ResourceHandler resourceHandler = new ResourceHandler();
		resourceHandler.setDirectoriesListed(true);
		resourceHandler.setWelcomeFiles(new String[]{"budget.html"});
		resourceHandler.setResourceBase(".");

		final HandlerList handlers = new HandlerList();
		handlers.setHandlers(new Handler[]{resourceHandler, servletContextHandler, new DefaultHandler()});

		server.setHandler(handlers);

		server.start();
		server.join();
	}

}
