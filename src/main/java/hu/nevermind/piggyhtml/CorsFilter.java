package hu.nevermind.piggyhtml;

import java.io.IOException;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletResponse;

public class CorsFilter implements Filter {

	@Override
	public void doFilter(final ServletRequest request, final ServletResponse response,
						 final FilterChain filterChain) throws IOException, ServletException {

		if(response instanceof HttpServletResponse){
			final HttpServletResponse alteredResponse = ((HttpServletResponse)response);
			addCorsHeader(alteredResponse);
		}

		filterChain.doFilter(request, response);
	}

	private void addCorsHeader(final HttpServletResponse response){
		response.addHeader("Access-Control-Allow-Origin", "*");
		response.addHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, HEAD");
		response.addHeader("Access-Control-Allow-Headers", "X-PINGOTHER, Origin, X-Requested-With, Content-Type, Accept");
		response.addHeader("Access-Control-Max-Age", "1728000");
		response.addHeader("Content-Type", "application/json");
	}

	@Override
	public void destroy() {}

	@Override
	public void init(final FilterConfig filterConfig)throws ServletException {}
}
